import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Queries ──────────────────────────────────────────────────────────────────

export const listAnalyses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("analyses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const getAnalysis = query({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    // Only the owner can view their analysis
    const userId = await getAuthUserId(ctx);
    if (doc.userId && doc.userId !== userId) return null;
    return doc;
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const createAnalysis = mutation({
  args: {
    pr_title: v.string(),
    diff: v.string(),
    openapi_spec: v.optional(v.string()),
    db_schema: v.optional(v.string()),
    target_framework: v.string(),
    pullRequestId: v.optional(v.id("pullRequests")),
    source: v.optional(v.union(v.literal("manual"), v.literal("github_pr"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const id = await ctx.db.insert("analyses", {
      userId: userId ?? undefined,
      source: args.source ?? "manual",
      pullRequestId: args.pullRequestId,
      pr_title: args.pr_title,
      diff: args.diff,
      openapi_spec: args.openapi_spec,
      db_schema: args.db_schema,
      target_framework: args.target_framework,
      status: "pending",
    });
    return id;
  },
});

export const updateAnalysisStatus = mutation({
  args: {
    id: v.id("analyses"),
    status: v.union(
      v.literal("pending"),
      v.literal("parsing"),
      v.literal("blast_radius"),
      v.literal("fuzz_construction"),
      v.literal("test_synthesis"),
      v.literal("test_execution"),
      v.literal("remediation"),
      v.literal("complete"),
      v.literal("error"),
    ),
    report: v.optional(v.string()),
    error_message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// ── Actions ───────────────────────────────────────────────────────────────────

export const runAnalysis = action({
  args: {
    analysisId: v.id("analyses"),
    diff: v.string(),
    pr_title: v.string(),
    openapi_spec: v.optional(v.string()),
    db_schema: v.optional(v.string()),
    target_framework: v.string(),
    // Optional GitHub PR metadata — when present, the report is posted as a PR comment
    github_installation_id: v.optional(v.number()),
    github_owner: v.optional(v.string()),
    github_repo: v.optional(v.string()),
    github_pr_number: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

    await ctx.runMutation(api.analyses.updateAnalysisStatus, {
      id: args.analysisId,
      status: "parsing",
    });

    try {
      const response = await fetch(`${backendUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diff: args.diff,
          pr_title: args.pr_title,
          openapi_spec: args.openapi_spec,
          db_schema: args.db_schema,
          target_framework: args.target_framework,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error ${response.status}: ${errorText}`);
      }

      const report = await response.json();

      await ctx.runMutation(api.analyses.updateAnalysisStatus, {
        id: args.analysisId,
        status: "complete",
        report: JSON.stringify(report),
      });

      // Post the markdown report as a PR comment when GitHub metadata is provided
      if (
        args.github_installation_id != null &&
        args.github_owner &&
        args.github_repo &&
        args.github_pr_number != null
      ) {
        try {
          await fetch(`${backendUrl}/github/pr-comment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              installation_id: args.github_installation_id,
              owner: args.github_owner,
              repo: args.github_repo,
              pr_number: args.github_pr_number,
              markdown_report: report.markdown_report,
            }),
          });
        } catch (commentErr) {
          // Non-fatal: log but don't fail the analysis
          console.warn("Failed to post PR comment:", commentErr);
        }
      }

      return { success: true, report };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await ctx.runMutation(api.analyses.updateAnalysisStatus, {
        id: args.analysisId,
        status: "error",
        error_message: msg,
      });
      throw err;
    }
  },
});

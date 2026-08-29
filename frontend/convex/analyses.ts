import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// ── Queries ──────────────────────────────────────────────────────────────────

export const listAnalyses = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("analyses").order("desc").take(20);
  },
});

export const getAnalysis = query({
  args: { id: v.id("analyses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("analyses", {
      ...args,
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
      v.literal("error")
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
  },
  handler: async (ctx, args) => {
    const backendUrl = "http://localhost:8000";

    // Update status to parsing
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

      return { success: true, report };
    } catch (err: any) {
      await ctx.runMutation(api.analyses.updateAnalysisStatus, {
        id: args.analysisId,
        status: "error",
        error_message: err.message ?? "Unknown error",
      });
      throw err;
    }
  },
});

export const runDemoAnalysis = action({
  args: { analysisId: v.id("analyses") },
  handler: async (ctx, args) => {
    const backendUrl = "http://localhost:8000";

    await ctx.runMutation(api.analyses.updateAnalysisStatus, {
      id: args.analysisId,
      status: "parsing",
    });

    try {
      const response = await fetch(`${backendUrl}/analyze/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Backend error ${response.status}`);
      }

      const report = await response.json();

      await ctx.runMutation(api.analyses.updateAnalysisStatus, {
        id: args.analysisId,
        status: "complete",
        report: JSON.stringify(report),
      });

      return { success: true, report };
    } catch (err: any) {
      await ctx.runMutation(api.analyses.updateAnalysisStatus, {
        id: args.analysisId,
        status: "error",
        error_message: err.message ?? "Unknown error",
      });
      throw err;
    }
  },
});

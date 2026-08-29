import { v } from "convex/values";
import { query, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Queries ───────────────────────────────────────────────────────────────────

export const listInstallations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const userInstallations = await ctx.db
      .query("installations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (userInstallations.length > 0) {
      return userInstallations;
    }
    // Fallback for single-tenant / local development / unclaimed installations
    const all = await ctx.db.query("installations").collect();
    return all.filter((inst) => !inst.suspended);
  },
});

export const listRepos = query({
  args: { installationId: v.id("installations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repos")
      .withIndex("by_installation", (q) =>
        q.eq("installationId", args.installationId),
      )
      .collect();
  },
});

export const listPullRequests = query({
  args: { repoId: v.id("repos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pullRequests")
      .withIndex("by_repo", (q) => q.eq("repoId", args.repoId))
      .order("desc")
      .take(30);
  },
});

export const getRepoByFullName = query({
  args: { fullName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repos")
      .withIndex("by_full_name", (q) => q.eq("fullName", args.fullName))
      .first();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Called after a user signs in via GitHub OAuth.
 * Links any existing installations whose accountLogin matches the user's GitHub
 * username so that `listInstallations` returns them for the authenticated user.
 */
export const linkInstallationsToUser = action({
  args: {
    githubLogin: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    await ctx.runMutation(internal.github.claimInstallationsByLogin, {
      userId,
      accountLogin: args.githubLogin,
    });
  },
});

export const claimInstallationsByLogin = internalMutation({
  args: {
    userId: v.id("users"),
    accountLogin: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("installations")
      .withIndex("by_installation_id")
      .collect();
    for (const row of rows) {
      if (row.accountLogin === args.accountLogin && !row.userId) {
        await ctx.db.patch(row._id, { userId: args.userId });
      }
    }
  },
});

export const upsertInstallation = internalMutation({
  args: {
    installationId: v.number(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
    suspended: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("installations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        suspended: args.suspended,
        accountLogin: args.accountLogin,
      });
      return existing._id;
    }
    return await ctx.db.insert("installations", {
      installationId: args.installationId,
      accountLogin: args.accountLogin,
      accountType: args.accountType,
      suspended: args.suspended,
    });
  },
});

export const upsertRepo = internalMutation({
  args: {
    installationId: v.id("installations"),
    githubRepoId: v.number(),
    owner: v.string(),
    name: v.string(),
    fullName: v.string(),
    private: v.boolean(),
    defaultBranch: v.string(),
    htmlUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("repos")
      .withIndex("by_full_name", (q) => q.eq("fullName", args.fullName))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("repos", args);
  },
});

export const upsertPullRequest = internalMutation({
  args: {
    repoId: v.id("repos"),
    prNumber: v.number(),
    title: v.string(),
    author: v.string(),
    headSha: v.string(),
    baseSha: v.string(),
    htmlUrl: v.string(),
    state: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("merged"),
    ),
    diffContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pullRequests")
      .withIndex("by_repo_and_number", (q) =>
        q.eq("repoId", args.repoId).eq("prNumber", args.prNumber),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("pullRequests", args);
  },
});

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Called from the GitHub App webhook handler (via the FastAPI backend).
 * Stores or updates the installation and syncs its repos.
 */
export const handleWebhookInstallation = action({
  args: {
    installationId: v.number(),
    accountLogin: v.string(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
    action: v.string(), // "created" | "deleted" | "suspend" | "unsuspend"
    repositories: v.optional(
      v.array(
        v.object({
          id: v.number(),
          name: v.string(),
          fullName: v.string(),
          private: v.boolean(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const suspended =
      args.action === "suspend" || args.action === "deleted";

    const installConvexId: string = await ctx.runMutation(
      internal.github.upsertInstallation,
      {
        installationId: args.installationId,
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        suspended,
      },
    );

    // Upsert repos that came with the event
    for (const repo of args.repositories ?? []) {
      await ctx.runMutation(internal.github.upsertRepo, {
        installationId: installConvexId as any,
        githubRepoId: repo.id,
        owner: args.accountLogin,
        name: repo.name,
        fullName: repo.fullName,
        private: repo.private,
        defaultBranch: "main",
        htmlUrl: `https://github.com/${repo.fullName}`,
      });
    }
  },
});

/**
 * Called when a PR is opened/synchronised via GitHub webhook.
 * Stores the PR and fetches its diff.
 */
export const handleWebhookPullRequest = action({
  args: {
    repoFullName: v.string(),
    prNumber: v.number(),
    title: v.string(),
    author: v.string(),
    headSha: v.string(),
    baseSha: v.string(),
    htmlUrl: v.string(),
    state: v.union(v.literal("open"), v.literal("closed"), v.literal("merged")),
    diffContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const repo = await ctx.runQuery(api.github.getRepoByFullName, {
      fullName: args.repoFullName,
    });
    if (!repo) {
      console.warn(`Repo ${args.repoFullName} not found in Convex, skipping`);
      return;
    }

    await ctx.runMutation(internal.github.upsertPullRequest, {
      repoId: repo._id,
      prNumber: args.prNumber,
      title: args.title,
      author: args.author,
      headSha: args.headSha,
      baseSha: args.baseSha,
      htmlUrl: args.htmlUrl,
      state: args.state,
      diffContent: args.diffContent,
    });
  },
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // ── convex-auth managed tables ───────────────────────────────────────────
  ...authTables,

  // ── GitHub App installations ─────────────────────────────────────────────
  installations: defineTable({
    // GitHub installation ID from the App webhook
    installationId: v.number(),
    // GitHub account (user or org) that installed the app
    accountLogin: v.string(),
    accountType: v.union(v.literal("User"), v.literal("Organization")),
    // Convex user who connected it (null if installed via org without login)
    userId: v.optional(v.id("users")),
    accessTokensUrl: v.optional(v.string()),
    repositoriesUrl: v.optional(v.string()),
    suspended: v.boolean(),
  })
    .index("by_installation_id", ["installationId"])
    .index("by_user", ["userId"]),

  // ── Repositories visible to the app ────────────────────────────────────
  repos: defineTable({
    installationId: v.id("installations"),
    githubRepoId: v.number(),
    owner: v.string(),
    name: v.string(),
    fullName: v.string(),
    private: v.boolean(),
    defaultBranch: v.string(),
    htmlUrl: v.string(),
  })
    .index("by_installation", ["installationId"])
    .index("by_full_name", ["fullName"]),

  // ── Pull requests tracked by the app ───────────────────────────────────
  pullRequests: defineTable({
    repoId: v.id("repos"),
    prNumber: v.number(),
    title: v.string(),
    author: v.string(),
    headSha: v.string(),
    baseSha: v.string(),
    htmlUrl: v.string(),
    state: v.union(v.literal("open"), v.literal("closed"), v.literal("merged")),
    // Populated once we fetch it from the GitHub API
    diffContent: v.optional(v.string()),
  })
    .index("by_repo", ["repoId"])
    .index("by_repo_and_number", ["repoId", "prNumber"]),

  // ── Analysis runs ────────────────────────────────────────────────────────
  analyses: defineTable({
    // Who triggered it
    userId: v.optional(v.id("users")),
    source: v.optional(v.union(v.literal("manual"), v.literal("github_pr"))),
    pullRequestId: v.optional(v.id("pullRequests")),

    pr_title: v.string(),
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
    diff: v.string(),
    openapi_spec: v.optional(v.string()),
    db_schema: v.optional(v.string()),
    target_framework: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_pr", ["pullRequestId"]),
});

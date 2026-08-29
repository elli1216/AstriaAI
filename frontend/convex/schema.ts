import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  analyses: defineTable({
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
      v.literal("error")
    ),
    // Stringified JSON of the AnalysisReport from FastAPI
    report: v.optional(v.string()),
    error_message: v.optional(v.string()),
    diff: v.string(),
    openapi_spec: v.optional(v.string()),
    db_schema: v.optional(v.string()),
    target_framework: v.string(),
  }),
});

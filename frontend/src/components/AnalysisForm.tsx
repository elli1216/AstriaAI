import * as React from 'react'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useDashboardStore } from '~/store'

export function AnalysisForm() {
  const {
    prTitle, setPrTitle,
    diff, setDiff,
    openapiSpec, setOpenapiSpec,
    dbSchema, setDbSchema,
    framework, setFramework,
    isSubmitting, setIsSubmitting,
    setSelectedId,
    loadDemo,
  } = useDashboardStore()

  const createAnalysis = useMutation(api.analyses.createAnalysis)
  const runAnalysis = useAction(api.analyses.runAnalysis)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!diff.trim()) return

    setIsSubmitting(true)
    try {
      const id = await createAnalysis({
        pr_title: prTitle,
        diff,
        openapi_spec: openapiSpec || undefined,
        db_schema: dbSchema || undefined,
        target_framework: framework,
      })

      setSelectedId(id)

      // Fire-and-forget — Convex action calls the FastAPI backend
      void runAnalysis({
        analysisId: id,
        diff,
        pr_title: prTitle,
        openapi_spec: openapiSpec || undefined,
        db_schema: dbSchema || undefined,
        target_framework: framework,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header + demo loader */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">New Analysis</h2>
        <button
          type="button"
          onClick={loadDemo}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
        >
          ✨ Load Demo Scenario
        </button>
      </div>

      {/* PR Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">PR Title</label>
        <input
          type="text"
          value={prTitle}
          onChange={(e) => setPrTitle(e.target.value)}
          placeholder="feat: ..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/50"
        />
      </div>

      {/* Diff */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">
          Git Diff <span className="text-red-400">*</span>
        </label>
        <textarea
          value={diff}
          onChange={(e) => setDiff(e.target.value)}
          required
          rows={8}
          placeholder="Paste a unified diff here (git diff output)…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-400/50 resize-y"
        />
      </div>

      {/* OpenAPI Spec */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">
          OpenAPI Spec{' '}
          <span className="text-gray-500">(optional — improves route detection)</span>
        </label>
        <textarea
          value={openapiSpec}
          onChange={(e) => setOpenapiSpec(e.target.value)}
          rows={5}
          placeholder="Paste OpenAPI/Swagger YAML or JSON…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-400/50 resize-y"
        />
      </div>

      {/* DB Schema */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">
          DB Schema{' '}
          <span className="text-gray-500">(optional — Prisma, SQL DDL, etc.)</span>
        </label>
        <textarea
          value={dbSchema}
          onChange={(e) => setDbSchema(e.target.value)}
          rows={4}
          placeholder="Paste schema.prisma or SQL DDL…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-400/50 resize-y"
        />
      </div>

      {/* Framework selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-400">Test Framework</label>
        <div className="flex gap-3">
          {(['pytest', 'vitest'] as const).map((fw) => (
            <button
              key={fw}
              type="button"
              onClick={() => setFramework(fw)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                framework === fw
                  ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                  : 'text-gray-400 border-white/10 hover:border-white/20'
              }`}
            >
              {fw === 'pytest' ? '🐍 pytest' : '⚡ vitest'}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !diff.trim()}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {isSubmitting ? '⟳ Starting analysis…' : '🚀 Run Blast Radius Analysis'}
      </button>
    </form>
  )
}

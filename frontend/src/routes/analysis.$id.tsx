// Full analysis report page
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { NavBar } from '~/components/NavBar'
import { AnalysisReportView } from '~/components/AnalysisReportView'
import { StatusStepper } from '~/components/StatusStepper'
import type { AnalysisReport, AnalysisStatus } from '~/types'
import * as React from 'react'

export const Route = createFileRoute('/analysis/$id')({
  component: AnalysisPage,
})

function AnalysisPage() {
  const { id } = Route.useParams()

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8 w-full">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/dashboard" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-white font-mono text-xs">{id.slice(0, 12)}…</span>
        </div>

        <React.Suspense fallback={<LoadingSkeleton />}>
          <AnalysisContent id={id} />
        </React.Suspense>
      </div>
    </div>
  )
}

function AnalysisContent({ id }: { id: string }) {
  const { data: analysis } = useSuspenseQuery(
    convexQuery(api.analyses.getAnalysis, { id: id as any }),
  )

  if (!analysis) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-gray-400">
        Analysis not found or you don't have access.{' '}
        <Link to="/dashboard" className="text-blue-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const report: AnalysisReport | null = React.useMemo(() => {
    if (!analysis.report) return null
    try {
      return JSON.parse(analysis.report) as AnalysisReport
    } catch {
      return null
    }
  }, [analysis.report])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass rounded-2xl p-5">
        <h1 className="text-lg font-bold text-white mb-1">{analysis.pr_title}</h1>
        <p className="text-xs text-gray-500">
          {analysis.source === 'github_pr' ? '🔗 GitHub PR' : '📝 Manual'} ·{' '}
          {analysis.target_framework}
        </p>
      </div>

      {/* In-progress */}
      {analysis.status !== 'complete' && analysis.status !== 'error' && (
        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-300">Running analysis…</p>
          <StatusStepper status={analysis.status as AnalysisStatus} />
        </div>
      )}

      {/* Error */}
      {analysis.status === 'error' && (
        <div className="glass rounded-2xl p-5 border border-red-500/20">
          <p className="text-sm font-semibold text-red-400 mb-1">⚠ Analysis failed</p>
          <p className="text-xs text-gray-400">
            {analysis.error_message ?? 'Unknown error'}
          </p>
        </div>
      )}

      {/* Full report */}
      {report && <AnalysisReportView report={report} />}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-20 rounded-2xl bg-white/5" />
      <div className="h-40 rounded-2xl bg-white/5" />
      <div className="h-64 rounded-2xl bg-white/5" />
    </div>
  )
}

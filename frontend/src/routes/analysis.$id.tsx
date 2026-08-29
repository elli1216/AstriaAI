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
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--gh-canvas)' }}
    >
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-6 w-full">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--gh-text-muted)] mb-5">
          <Link
            to="/dashboard"
            className="hover:underline hover:text-[var(--gh-text)] transition-colors"
            style={{ color: 'var(--gh-accent)' }}
          >
            Dashboard
          </Link>
          <span>/</span>
          <span>Analysis</span>
          <span>/</span>
          <span className="font-mono text-[var(--gh-text)] font-semibold">
            {id.slice(0, 12)}…
          </span>
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
      <div className="gh-card p-10 text-center text-sm text-[var(--gh-text-muted)]">
        <p className="font-semibold text-base text-[var(--gh-text)] mb-2">Analysis Not Found</p>
        <p className="mb-4 text-xs">The requested analysis report does not exist or has expired.</p>
        <Link to="/dashboard" className="gh-btn text-xs">
          ← Back to Dashboard
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
      <div className="gh-card p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="gh-label text-xs"
                style={{
                  backgroundColor: 'var(--gh-surface-2)',
                  borderColor: 'var(--gh-border)',
                  color: 'var(--gh-accent)',
                }}
              >
                {analysis.source === 'github_pr' ? '🐙 GitHub PR Webhook' : '✨ Manual Diff Studio'}
              </span>
              <span className="text-xs text-[var(--gh-text-muted)] font-mono">
                {analysis.target_framework}
              </span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--gh-text)' }}>
              {analysis.pr_title}
            </h1>
          </div>

          <Link to="/dashboard" className="gh-btn text-xs self-start sm:self-auto">
            ← All Analyses
          </Link>
        </div>
      </div>

      {/* In-progress */}
      {analysis.status !== 'complete' && analysis.status !== 'error' && (
        <div className="gh-card p-6 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--gh-accent)] animate-ping" />
            <p className="text-sm font-semibold" style={{ color: 'var(--gh-text)' }}>
              Running IBM Granite Multi-Agent Pipeline…
            </p>
          </div>
          <StatusStepper status={analysis.status as AnalysisStatus} />
        </div>
      )}

      {/* Error */}
      {analysis.status === 'error' && (
        <div className="gh-card p-5 border-[var(--gh-red)] bg-[var(--gh-red-muted)] shadow-sm">
          <p className="text-sm font-semibold text-[var(--gh-red-text)] mb-1 flex items-center gap-1.5">
            <span>⚠</span>
            <span>Analysis failed</span>
          </p>
          <p className="text-xs font-mono text-[var(--gh-text-muted)]">
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
    <div className="flex flex-col gap-4">
      <div className="h-20 gh-card gh-skeleton" />
      <div className="h-40 gh-card gh-skeleton" />
      <div className="h-64 gh-card gh-skeleton" />
    </div>
  )
}

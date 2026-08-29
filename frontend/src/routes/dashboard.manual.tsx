// Manual analysis page — paste a diff and run it manually
import { createFileRoute } from '@tanstack/react-router'
import { NavBar } from '~/components/NavBar'
import { AnalysisForm } from '~/components/AnalysisForm'
import { AnalysisReportView } from '~/components/AnalysisReportView'
import { StatusStepper } from '~/components/StatusStepper'
import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { useDashboardStore } from '~/store'
import type { AnalysisReport, AnalysisStatus } from '~/types'

export const Route = createFileRoute('/dashboard/manual')({
  component: ManualAnalysisPage,
})

function ManualAnalysisPage() {
  const { selectedId } = useDashboardStore()

  const { data: analyses } = useSuspenseQuery(
    convexQuery(api.analyses.listAnalyses, {}),
  )

  const selectedAnalysis =
    analyses?.find((a) => a._id === selectedId) ?? null

  const report = React.useMemo((): AnalysisReport | null => {
    if (!selectedAnalysis?.report) return null
    try {
      return JSON.parse(selectedAnalysis.report) as AnalysisReport
    } catch {
      return null
    }
  }, [selectedAnalysis?.report])

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--gh-canvas)' }}>
      <NavBar />

      {/* Header bar */}
      <div style={{ borderBottom: '1px solid var(--gh-border)' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--gh-text-muted)] mb-1">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-[var(--gh-text)] font-medium">Manual Studio</span>
            </div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--gh-text)' }}>
              Blast Radius Studio
            </h1>
          </div>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs"
            style={{
              backgroundColor: 'var(--gh-accent-muted)',
              borderColor: 'rgba(31,111,235,0.3)',
              color: 'var(--gh-accent)',
            }}
          >
            <span>💡</span>
            <span>No active GitHub PR required. Test any diff or load the demo.</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left: Form ──────────────────────────────────────────────── */}
        <aside className="lg:col-span-5 flex flex-col gap-6">
          <div className="gh-card p-5 shadow-sm">
            <AnalysisForm />
          </div>
        </aside>

        {/* ── Right: Report ───────────────────────────────────────────── */}
        <main className="lg:col-span-7 flex flex-col gap-6">
          {selectedAnalysis ? (
            <>
              {selectedAnalysis.status !== 'complete' &&
                selectedAnalysis.status !== 'error' && (
                  <div className="gh-card p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--gh-accent)] animate-ping" />
                      <p className="text-sm font-semibold" style={{ color: 'var(--gh-text)' }}>
                        Running Multi-Agent Pipeline…
                      </p>
                    </div>
                    <StatusStepper
                      status={selectedAnalysis.status as AnalysisStatus}
                    />
                  </div>
                )}
              {selectedAnalysis.status === 'error' && (
                <div className="gh-card p-5 border-[var(--gh-red)] bg-[var(--gh-red-muted)]">
                  <p className="text-sm font-semibold text-[var(--gh-red-text)] mb-1 flex items-center gap-1.5">
                    <span>⚠</span>
                    <span>Analysis failed</span>
                  </p>
                  <p className="text-xs text-[var(--gh-text-muted)] font-mono">
                    {selectedAnalysis.error_message ?? 'Unknown error'}
                  </p>
                </div>
              )}
              {report && <AnalysisReportView report={report} />}
            </>
          ) : (
            <EmptyPanel />
          )}
        </main>
      </div>
    </div>
  )
}

function EmptyPanel() {
  const { loadDemo } = useDashboardStore()
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[420px] gap-4 text-center gh-card p-10 border-dashed">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-[var(--gh-surface-2)] border border-[var(--gh-border)] shadow-inner">
        🔬
      </div>
      <div>
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--gh-text)' }}>
          Ready to Analyze Blast Radius
        </p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--gh-text-muted)', lineHeight: 1.6 }}>
          Paste a unified git diff on the left form, or click below to immediately test the built-in breaking change demo.
        </p>
      </div>
      <button
        onClick={loadDemo}
        className="gh-btn-primary text-xs py-2 px-4 shadow-sm mt-1"
      >
        ✨ Load Demo Scenario
      </button>
    </div>
  )
}

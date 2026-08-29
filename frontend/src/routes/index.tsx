import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { AnalysisForm } from '~/components/AnalysisForm'
import { AnalysisReportView } from '~/components/AnalysisReportView'
import { StatusStepper } from '~/components/StatusStepper'
import { RiskBadge } from '~/components/RiskBadge'
import type { AnalysisReport, AnalysisStatus } from '~/types'
import { useDashboardStore } from '~/store'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const { selectedId, setSelectedId } = useDashboardStore()

  const { data: analyses } = useSuspenseQuery(
    convexQuery(api.analyses.listAnalyses, {}),
  )

  const selectedAnalysis = analyses?.find((a) => a._id === selectedId) ?? null

  const report: AnalysisReport | null = React.useMemo(() => {
    if (!selectedAnalysis?.report) return null
    try {
      return JSON.parse(selectedAnalysis.report) as AnalysisReport
    } catch {
      return null
    }
  }, [selectedAnalysis?.report])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-white/5 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                ImpactTest AI
              </h1>
              <p className="text-xs text-gray-500">
                Autonomous PR blast-radius analyzer · IBM Granite on watsonx.ai
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            watsonx.ai connected
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 w-full grid grid-cols-12 gap-6 flex-1">
        {/* ── Left Sidebar: Form + History ─────────────────────────────── */}
        <aside className="col-span-4 flex flex-col gap-6">
          {/* New Analysis Form */}
          <div className="glass rounded-2xl p-6">
            <AnalysisForm />
          </div>

          {/* Run History */}
          {analyses && analyses.length > 0 && (
            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-300">Recent Analyses</h3>
              <div className="flex flex-col gap-2">
                {analyses.map((a) => {
                  const r = a.report ? (JSON.parse(a.report) as AnalysisReport) : null
                  return (
                    <button
                      key={a._id}
                      onClick={() => setSelectedId(a._id)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedId === a._id
                          ? 'border-blue-400/40 bg-blue-500/10'
                          : 'border-white/5 bg-white/3 hover:bg-white/5'
                      }`}
                    >
                      <p className="text-xs font-medium text-white truncate">{a.pr_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {r ? (
                          <RiskBadge
                            level={r.blast_radius.risk_level}
                            score={r.blast_radius.risk_score}
                          />
                        ) : (
                          <StatusStepper status={a.status as AnalysisStatus} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main Panel: Report ───────────────────────────────────────── */}
        <main className="col-span-8 flex flex-col gap-6">
          {selectedAnalysis ? (
            <>
              {/* Status / live progress */}
              {selectedAnalysis.status !== 'complete' &&
                selectedAnalysis.status !== 'error' && (
                  <div className="glass rounded-2xl p-5 flex flex-col gap-3">
                    <h2 className="text-sm font-semibold text-gray-300">
                      Running analysis…
                    </h2>
                    <StatusStepper status={selectedAnalysis.status as AnalysisStatus} />
                  </div>
                )}

              {/* Error state */}
              {selectedAnalysis.status === 'error' && (
                <div className="glass rounded-2xl p-5 border border-red-500/20">
                  <p className="text-sm font-semibold text-red-400 mb-1">
                    ⚠ Analysis failed
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedAnalysis.error_message ?? 'Unknown error occurred'}
                  </p>
                </div>
              )}

              {/* Full report */}
              {report && <AnalysisReportView report={report} />}
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 gap-6 text-center">
      <div className="text-6xl">🔬</div>
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">
          No analysis selected
        </h2>
        <p className="text-sm text-gray-400 max-w-sm">
          Paste a PR diff on the left — or click{' '}
          <strong className="text-blue-300">Load Demo Scenario</strong> to see
          the invisible{' '}
          <code className="text-orange-300">billing_address</code> regression in
          action.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-xs text-gray-500 max-w-sm">
        <FeaturePoint icon="🧬" text="IBM Granite traces blast radius across all downstream services" />
        <FeaturePoint icon="🎯" text="Fuzz payloads expose null-safety & schema regressions" />
        <FeaturePoint icon="⚡" text="Executable pytest / vitest tests generated in seconds" />
        <FeaturePoint icon="🔧" text="1-click patch auto-generated when regressions are caught" />
      </div>
    </div>
  )
}

function FeaturePoint({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2 text-left">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

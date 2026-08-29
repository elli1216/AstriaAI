import * as React from 'react'
import type { AnalysisReport } from '~/types'
import { RiskBadge } from './RiskBadge'
import { BlastRadiusGraph } from './BlastRadiusGraph'

interface AnalysisReportViewProps {
  report: AnalysisReport
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  POST: 'bg-green-500/20 text-green-300 border-green-500/40',
  PUT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  PATCH: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  DELETE: 'bg-red-500/20 text-red-300 border-red-500/40',
}

export function AnalysisReportView({ report }: AnalysisReportViewProps) {
  const [testTab, setTestTab] = React.useState<'code' | 'output'>('code')
  const { blast_radius, fuzz_payloads, synthesized_test, test_execution, remediation } = report

  return (
    <div className="flex flex-col gap-6">
      {/* ── Blast Radius Overview ───────────────────────────────────────── */}
      <section className="glass rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Blast Radius Analysis</h2>
          <RiskBadge level={blast_radius.risk_level} score={blast_radius.risk_score} />
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{blast_radius.summary}</p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Impacted Routes" value={blast_radius.impacted_routes.length} />
          <StatCard label="Impacted Models" value={blast_radius.impacted_models.length} />
          <StatCard
            label="Risk Score"
            value={`${blast_radius.risk_score}/100`}
            highlight={blast_radius.risk_score > 70}
          />
        </div>
      </section>

      {/* ── React Flow Graph ────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-6 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-white">Impact Graph</h2>
        <BlastRadiusGraph blastRadius={blast_radius} />
      </section>

      {/* ── Impacted Routes Table ───────────────────────────────────────── */}
      <section className="glass rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Impacted Endpoints</h2>
        <div className="flex flex-col gap-2">
          {blast_radius.impacted_routes.map((route, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5"
            >
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${METHOD_COLORS[route.method] ?? 'bg-gray-500/20 text-gray-300'}`}
              >
                {route.method}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-mono text-white">{route.path}</span>
                <span className="text-xs text-gray-400 ml-2">({route.service})</span>
                <p className="text-xs text-gray-400 mt-0.5">{route.risk_reason}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fuzz Payloads ───────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">
          Edge-Case Payloads
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({fuzz_payloads.payloads.length} generated)
          </span>
        </h2>
        <div className="flex flex-col gap-3">
          {fuzz_payloads.payloads.map((p, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-white/5 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-semibold text-orange-300">{p.name}</span>
              </div>
              <p className="text-xs text-gray-300 mb-2">{p.description}</p>
              <pre className="text-xs text-gray-400 bg-black/30 rounded p-2 overflow-x-auto">
                {JSON.stringify(p.payload, null, 2)}
              </pre>
              <p className="text-xs text-red-300 mt-1">⚠ {p.expected_failure}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Synthesized Test ────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Synthesized Regression Test
          </h2>
          <div className="flex gap-2">
            <TabButton active={testTab === 'code'} onClick={() => setTestTab('code')}>
              Code
            </TabButton>
            {test_execution && (
              <TabButton active={testTab === 'output'} onClick={() => setTestTab('output')}>
                Output
              </TabButton>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="px-2 py-0.5 rounded bg-white/10 font-mono">
            {synthesized_test.filename}
          </span>
          <span>·</span>
          <span>{synthesized_test.framework}</span>
        </div>

        {testTab === 'code' ? (
          <pre className="text-xs text-gray-200 bg-black/40 rounded-xl p-4 overflow-x-auto max-h-96 leading-relaxed">
            <code>{synthesized_test.content}</code>
          </pre>
        ) : (
          test_execution && (
            <div className="flex flex-col gap-3">
              {/* Test summary */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Passed" value={test_execution.passed} color="text-green-400" />
                <StatCard label="Failed" value={test_execution.failed} color="text-red-400" />
                <StatCard label="Errors" value={test_execution.errors} color="text-yellow-400" />
              </div>
              {test_execution.regressions_caught.length > 0 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs font-semibold text-red-400 mb-2">
                    🚨 Regressions Caught:
                  </p>
                  {test_execution.regressions_caught.map((r, i) => (
                    <p key={i} className="text-xs font-mono text-red-300">
                      • {r}
                    </p>
                  ))}
                </div>
              )}
              <pre className="text-xs text-gray-300 bg-black/40 rounded-xl p-4 overflow-x-auto max-h-64 leading-relaxed">
                {test_execution.output}
              </pre>
            </div>
          )
        )}
      </section>

      {/* ── Remediation Patch ───────────────────────────────────────────── */}
      {remediation && (
        <section className="glass rounded-2xl p-6 flex flex-col gap-4 border border-emerald-500/20">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🔧</span> 1-Click Patch
          </h2>
          <p className="text-xs text-gray-300">{remediation.explanation}</p>
          <p className="text-xs font-mono text-gray-400">
            File: <span className="text-white">{remediation.file_path}</span>
          </p>
          <div className="rounded-xl overflow-hidden text-xs font-mono">
            {remediation.original_snippet.split('\n').map((line, i) => (
              <div key={`rem-${i}`} className="bg-red-500/10 text-red-300 px-4 py-0.5">
                - {line}
              </div>
            ))}
            {remediation.patched_snippet.split('\n').map((line, i) => (
              <div key={`add-${i}`} className="bg-green-500/10 text-green-300 px-4 py-0.5">
                + {line}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
  color,
}: {
  label: string
  value: string | number
  highlight?: boolean
  color?: string
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/5 border border-white/5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-2xl font-bold ${highlight ? 'text-red-400' : (color ?? 'text-white')}`}>
        {value}
      </span>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          : 'text-gray-400 hover:text-gray-200 border border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

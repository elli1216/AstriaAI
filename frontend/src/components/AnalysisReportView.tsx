import * as React from 'react'
import type { AnalysisReport } from '~/types'
import { RiskBadge } from './RiskBadge'
import { BlastRadiusGraph } from './BlastRadiusGraph'

interface AnalysisReportViewProps {
  report: AnalysisReport
}

const METHOD_BADGES: Record<string, { bg: string; color: string; border: string }> = {
  GET: { bg: 'rgba(56,139,253,0.15)', color: '#58a6ff', border: 'rgba(56,139,253,0.4)' },
  POST: { bg: 'rgba(46,160,67,0.15)', color: '#3fb950', border: 'rgba(46,160,67,0.4)' },
  PUT: { bg: 'rgba(210,153,34,0.15)', color: '#d29922', border: 'rgba(210,153,34,0.4)' },
  PATCH: { bg: 'rgba(163,113,247,0.15)', color: '#bc8cff', border: 'rgba(163,113,247,0.4)' },
  DELETE: { bg: 'rgba(248,81,73,0.15)', color: '#f85149', border: 'rgba(248,81,73,0.4)' },
}

export function AnalysisReportView({ report }: AnalysisReportViewProps) {
  const [testTab, setTestTab] = React.useState<'code' | 'output'>('code')
  const { blast_radius, fuzz_payloads, synthesized_test, test_execution, remediation, metrics } = report

  const routes = blast_radius?.impacted_routes ?? []
  const payloads = fuzz_payloads?.payloads ?? []
  const models = blast_radius?.impacted_models ?? []

  function handleDownloadMarkdown() {
    if (!report.markdown_report) return
    const blob = new Blob([report.markdown_report], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(report.pr_title || 'astria-analysis').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-report.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Blast Radius Overview ───────────────────────────────────────── */}
      <section className="gh-card p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--gh-border)]">
          <div>
            <span className="text-xs font-semibold text-[var(--gh-accent)] uppercase tracking-wider">
              Blast Radius Analysis
            </span>
            <h2 className="text-lg font-semibold mt-0.5" style={{ color: 'var(--gh-text)' }}>
              Executive Impact Summary
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {report.markdown_report && (
              <button
                onClick={handleDownloadMarkdown}
                type="button"
                className="gh-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
                title="Download full Markdown report"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
                  <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
                </svg>
                <span>Export Report</span>
              </button>
            )}
            <RiskBadge level={blast_radius.risk_level} score={blast_radius.risk_score} />
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--gh-text-muted)' }}>
          {blast_radius.summary}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <StatCard label="Impacted Routes" value={routes.length} />
          <StatCard label="Impacted Models" value={models.length} />
          <StatCard
            label="Risk Score"
            value={`${blast_radius.risk_score}/100`}
            highlight={blast_radius.risk_score >= 70}
          />
        </div>
      </section>

      {/* ── AI Multi-Agent Metrics (if present) ─────────────────────────── */}
      {metrics && (
        <section className="gh-card p-4 flex flex-col gap-2.5 bg-[var(--gh-surface-2)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--gh-text)' }}>
              <span>⏱</span>
              <span>IBM Granite Inference Telemetry</span>
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--gh-canvas)] border border-[var(--gh-border)] text-[var(--gh-accent)]">
              {metrics.model_name || 'ibm/granite-4-h-small'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="p-2 rounded bg-[var(--gh-canvas)] border border-[var(--gh-border)]">
              <span className="text-[var(--gh-text-muted)] block text-[11px]">Parallel Discovery</span>
              <span className="font-mono font-bold text-[var(--gh-text)]">{metrics.blast_radius_latency_ms || 0} ms</span>
            </div>
            <div className="p-2 rounded bg-[var(--gh-canvas)] border border-[var(--gh-border)]">
              <span className="text-[var(--gh-text-muted)] block text-[11px]">Test Synthesis</span>
              <span className="font-mono font-bold text-[var(--gh-text)]">{metrics.test_synthesizer_latency_ms || 0} ms</span>
            </div>
            {metrics.remediation_latency_ms && (
              <div className="p-2 rounded bg-[var(--gh-canvas)] border border-[var(--gh-border)]">
                <span className="text-[var(--gh-text-muted)] block text-[11px]">Auto-Patch</span>
                <span className="font-mono font-bold text-[var(--gh-text)]">{metrics.remediation_latency_ms} ms</span>
              </div>
            )}
            <div className="p-2 rounded bg-[var(--gh-canvas)] border border-[var(--gh-border)]">
              <span className="text-[var(--gh-text-muted)] block text-[11px]">Total Pipeline</span>
              <span className="font-mono font-bold text-[var(--gh-green-text)]">{metrics.total_pipeline_latency_ms || 0} ms</span>
            </div>
          </div>
        </section>
      )}

      {/* ── React Flow Graph ────────────────────────────────────────────── */}
      <section className="gh-card p-6 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--gh-text)' }}>
            Service & Route Blast-Radius Graph
          </h2>
          <span className="text-xs text-[var(--gh-text-muted)]">Interactive topology</span>
        </div>
        <BlastRadiusGraph blastRadius={blast_radius} />
      </section>

      {/* ── Impacted Routes Table ───────────────────────────────────────── */}
      <section className="gh-card p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--gh-text)' }}>
            Impacted Endpoints & Services
          </h2>
          <span className="gh-label text-xs">
            {routes.length} affected
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {routes.map((route, i) => {
            const badge = METHOD_BADGES[route.method] || {
              bg: 'var(--gh-surface-2)',
              color: 'var(--gh-text)',
              border: 'var(--gh-border)',
            }
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border transition-colors gh-row"
                style={{
                  backgroundColor: 'var(--gh-surface-2)',
                  borderColor: 'var(--gh-border)',
                }}
              >
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0"
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    borderColor: badge.border,
                  }}
                >
                  {route.method}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-mono font-semibold" style={{ color: 'var(--gh-text)' }}>
                      {route.path}
                    </span>
                    <span className="text-xs px-1.5 py-0.2 rounded bg-[var(--gh-canvas)] text-[var(--gh-text-muted)] border border-[var(--gh-border)]">
                      {route.service}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--gh-text-muted)' }}>
                    {route.risk_reason}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Fuzz Payloads ───────────────────────────────────────────────── */}
      <section className="gh-card p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--gh-text)' }}>
            Adversarial & Edge-Case Payloads
          </h2>
          <span className="gh-label text-xs">
            {payloads.length} synthesized
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {payloads.map((p, i) => (
            <div
              key={i}
              className="p-3.5 rounded-lg border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--gh-surface-2)',
                borderColor: 'var(--gh-border)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-semibold text-[var(--gh-orange-text)]">
                    {p.name}
                  </span>
                  <CopyButton text={JSON.stringify(p.payload, null, 2)} />
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--gh-text-muted)' }}>
                  {p.description}
                </p>
                <pre
                  className="text-xs rounded p-2.5 overflow-x-auto font-mono max-h-36"
                  style={{
                    backgroundColor: 'var(--gh-canvas)',
                    border: '1px solid var(--gh-border)',
                    color: 'var(--gh-text)',
                  }}
                >
                  {JSON.stringify(p.payload, null, 2)}
                </pre>
              </div>
              <div className="mt-2 text-xs font-mono text-[var(--gh-red-text)] flex items-center gap-1.5">
                <span>⚠</span>
                <span>{p.expected_failure}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Synthesized Test ────────────────────────────────────────────── */}
      <section className="gh-card p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold" style={{ color: 'var(--gh-text)' }}>
              Synthesized Regression Test
            </h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--gh-surface-2)] border border-[var(--gh-border)] text-[var(--gh-text-muted)]">
              {synthesized_test.filename}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              role="tablist"
              className="flex rounded-md border border-[var(--gh-border)] bg-[var(--gh-surface-2)] p-0.5"
            >
              <button
                role="tab"
                aria-selected={testTab === 'code'}
                onClick={() => setTestTab('code')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  testTab === 'code'
                    ? 'bg-[var(--gh-accent)] text-white'
                    : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]'
                }`}
              >
                Code
              </button>
              {test_execution && (
                <button
                  role="tab"
                  aria-selected={testTab === 'output'}
                  onClick={() => setTestTab('output')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    testTab === 'output'
                      ? 'bg-[var(--gh-accent)] text-white'
                      : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]'
                  }`}
                >
                  Output
                </button>
              )}
            </div>

            {testTab === 'code' && <CopyButton text={synthesized_test.content} />}
          </div>
        </div>

        {testTab === 'code' ? (
          <pre
            className="text-xs rounded-xl p-4 overflow-x-auto max-h-96 leading-relaxed font-mono"
            style={{
              backgroundColor: 'var(--gh-canvas)',
              border: '1px solid var(--gh-border)',
              color: 'var(--gh-text)',
            }}
          >
            <code>{synthesized_test.content}</code>
          </pre>
        ) : (
          test_execution && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Passed" value={test_execution.passed} color="var(--gh-green-text)" />
                <StatCard label="Failed" value={test_execution.failed} color="var(--gh-red-text)" />
                <StatCard label="Errors" value={test_execution.errors} color="var(--gh-orange-text)" />
              </div>
              {test_execution.regressions_caught.length > 0 && (
                <div
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--gh-red-muted)',
                    borderColor: 'var(--gh-red)',
                  }}
                >
                  <p className="text-xs font-semibold text-[var(--gh-red-text)] mb-1.5 flex items-center gap-1">
                    <span>🚨</span>
                    <span>Regressions Caught:</span>
                  </p>
                  {test_execution.regressions_caught.map((r, i) => (
                    <p key={i} className="text-xs font-mono text-[var(--gh-red-text)]">
                      • {r}
                    </p>
                  ))}
                </div>
              )}
              <pre
                className="text-xs rounded-xl p-4 overflow-x-auto max-h-64 leading-relaxed font-mono"
                style={{
                  backgroundColor: 'var(--gh-canvas)',
                  border: '1px solid var(--gh-border)',
                  color: 'var(--gh-text-muted)',
                }}
              >
                {test_execution.output}
              </pre>
            </div>
          )
        )}
      </section>

      {/* ── Remediation Patch ───────────────────────────────────────────── */}
      {remediation && (
        <section
          className="gh-card p-6 flex flex-col gap-4 shadow-sm border-[var(--gh-green)]"
          style={{
            background: 'linear-gradient(135deg, rgba(46,160,67,0.05) 0%, var(--gh-surface) 100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--gh-text)' }}>
              <span>🔧</span>
              <span>Recommended 1-Click Patch</span>
            </h2>
            <CopyButton
              text={`--- a/${remediation.file_path}\n+++ b/${remediation.file_path}\n@@ -1 +1 @@\n${remediation.original_snippet
                .split('\n')
                .map((l) => `-${l}`)
                .join('\n')}\n${remediation.patched_snippet
                .split('\n')
                .map((l) => `+${l}`)
                .join('\n')}`}
            />
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--gh-text-muted)' }}>
            {remediation.explanation}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--gh-text-muted)' }}>
            <span>Target:</span>
            <span className="text-[var(--gh-accent)] font-semibold">{remediation.file_path}</span>
          </div>

          <div
            className="rounded-lg overflow-hidden text-xs font-mono border"
            style={{
              borderColor: 'var(--gh-border)',
              backgroundColor: 'var(--gh-canvas)',
            }}
          >
            {remediation.original_snippet.split('\n').map((line, i) => (
              <div
                key={`rem-${i}`}
                className="px-4 py-1 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(248,81,73,0.12)',
                  color: 'var(--gh-red-text)',
                }}
              >
                <span className="select-none opacity-60">-</span>
                <span>{line}</span>
              </div>
            ))}
            {remediation.patched_snippet.split('\n').map((line, i) => (
              <div
                key={`add-${i}`}
                className="px-4 py-1 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(46,160,67,0.12)',
                  color: 'var(--gh-green-text)',
                }}
              >
                <span className="select-none opacity-60">+</span>
                <span>{line}</span>
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
    <div
      className="flex flex-col gap-1 p-3 rounded-lg border"
      style={{
        backgroundColor: 'var(--gh-surface-2)',
        borderColor: 'var(--gh-border)',
      }}
    >
      <span className="text-xs" style={{ color: 'var(--gh-text-muted)' }}>
        {label}
      </span>
      <span
        className="text-xl sm:text-2xl font-bold"
        style={{
          color: highlight
            ? 'var(--gh-red-text)'
            : color
              ? color
              : 'var(--gh-text)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="gh-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <span className="text-[var(--gh-green-text)]">✓</span>
          <span className="text-[var(--gh-green-text)]">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  )
}

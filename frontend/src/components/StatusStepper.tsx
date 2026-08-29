import * as React from 'react'
import { clsx } from 'clsx'
import type { AnalysisStatus } from '~/types'
import { STATUS_LABELS } from '~/types'

const STEPS: AnalysisStatus[] = [
  'parsing',
  'blast_radius',
  'fuzz_construction',
  'test_synthesis',
  'test_execution',
  'remediation',
  'complete',
]

interface StatusStepperProps {
  status: AnalysisStatus
}

export function StatusStepper({ status }: StatusStepperProps) {
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--gh-text-muted)' }}>
        <span className="w-2 h-2 rounded-full bg-[var(--gh-text-muted)] animate-pulse" />
        <span>Waiting to start pipeline…</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--gh-red-text)]">
        <span>⚠ Analysis failed</span>
      </div>
    )
  }

  const currentIdx = STEPS.indexOf(status)

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx || status === 'complete'
        const isActive = idx === currentIdx && status !== 'complete'
        return (
          <React.Fragment key={step}>
            <div
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all',
                isDone &&
                  'bg-[var(--gh-green-muted)] text-[var(--gh-green-text)] border-[rgba(46,160,67,0.3)]',
                isActive &&
                  'bg-[var(--gh-accent-muted)] text-[var(--gh-accent)] border-[rgba(31,111,235,0.4)] animate-pulse',
                !isDone &&
                  !isActive &&
                  'bg-[var(--gh-surface-2)] text-[var(--gh-text-muted)] border-[var(--gh-border)] opacity-60',
              )}
            >
              <span className="text-[10px]">{isDone ? '✓' : isActive ? '⟳' : '○'}</span>
              <span>{STATUS_LABELS[step]}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <span
                className={clsx(
                  'text-[10px]',
                  idx < currentIdx ? 'text-[var(--gh-green-text)] opacity-60' : 'text-[var(--gh-text-muted)] opacity-40',
                )}
              >
                →
              </span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

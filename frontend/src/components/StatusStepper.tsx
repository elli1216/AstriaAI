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
      <div className="flex items-center gap-2 text-gray-400">
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse-slow" />
        <span className="text-sm">Waiting to start…</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <span className="text-sm font-medium">⚠ Analysis failed</span>
      </div>
    )
  }

  const currentIdx = STEPS.indexOf(status)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx || status === 'complete'
        const isActive = idx === currentIdx && status !== 'complete'
        return (
          <React.Fragment key={step}>
            <div
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                isDone &&
                  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
                isActive &&
                  'text-blue-300 bg-blue-400/10 border-blue-400/40 animate-pulse',
                !isDone &&
                  !isActive &&
                  'text-gray-600 bg-gray-800/40 border-gray-700',
              )}
            >
              {isDone ? '✓' : isActive ? '⟳' : '○'}
              <span>{STATUS_LABELS[step]}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <span
                className={clsx(
                  'text-xs',
                  idx < currentIdx ? 'text-emerald-700' : 'text-gray-700',
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

import { clsx } from 'clsx'
import type { RiskLevel } from '~/types'
import { RISK_COLORS, RISK_GLOW } from '~/types'

interface RiskBadgeProps {
  level: RiskLevel
  score?: number
  className?: string
}

export function RiskBadge({ level, score, className }: RiskBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border',
        RISK_COLORS[level],
        RISK_GLOW[level],
        className,
      )}
    >
      {level === 'critical' && '🔴'}
      {level === 'high' && '🟠'}
      {level === 'medium' && '🟡'}
      {level === 'low' && '🟢'}
      {level.toUpperCase()}
      {score !== undefined && (
        <span className="opacity-70 text-xs font-normal">({score}/100)</span>
      )}
    </span>
  )
}

import type { RiskLevel } from '~/types'

interface RiskBadgeProps {
  level: RiskLevel
  score?: number
  className?: string
}

const LEVEL_CLASSES: Record<RiskLevel, string> = {
  low:      'gh-label gh-risk-low',
  medium:   'gh-label gh-risk-medium',
  high:     'gh-label gh-risk-high',
  critical: 'gh-label gh-risk-critical',
}

const LEVEL_DOT: Record<RiskLevel, string> = {
  low:      '#3fb950',
  medium:   '#d29922',
  high:     '#f0883e',
  critical: '#f85149',
}

export function RiskBadge({ level, score, className = '' }: RiskBadgeProps) {
  return (
    <span className={`${LEVEL_CLASSES[level]} ${className}`}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill={LEVEL_DOT[level]}>
        <circle cx="4" cy="4" r="4" />
      </svg>
      {level.charAt(0).toUpperCase() + level.slice(1)}
      {score !== undefined && (
        <span style={{ opacity: 0.7, fontWeight: 400 }}>&nbsp;{score}/100</span>
      )}
    </span>
  )
}

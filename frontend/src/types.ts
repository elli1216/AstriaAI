// Shared TypeScript types matching the FastAPI AnalysisReport schema

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ImpactedRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  service: string
  risk_reason: string
}

export interface BlastRadiusResult {
  risk_level: RiskLevel
  risk_score: number
  impacted_routes: ImpactedRoute[]
  impacted_models: string[]
  summary: string
}

export interface FuzzPayload {
  name: string
  description: string
  payload: Record<string, unknown>
  expected_failure: string
}

export interface FuzzPayloadsResult {
  payloads: FuzzPayload[]
}

export interface SynthesizedTest {
  filename: string
  framework: string
  content: string
}

export interface TestExecutionResult {
  passed: number
  failed: number
  errors: number
  regressions_caught: string[]
  output: string
  success: boolean
}

export interface RemediationPatch {
  file_path: string
  original_snippet: string
  patched_snippet: string
  explanation: string
}

export interface AnalysisReport {
  pr_title: string
  blast_radius: BlastRadiusResult
  fuzz_payloads: FuzzPayloadsResult
  synthesized_test: SynthesizedTest
  test_execution?: TestExecutionResult
  remediation?: RemediationPatch
  markdown_report: string
}

export type AnalysisStatus =
  | 'pending'
  | 'parsing'
  | 'blast_radius'
  | 'fuzz_construction'
  | 'test_synthesis'
  | 'test_execution'
  | 'remediation'
  | 'complete'
  | 'error'

export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: 'Queued',
  parsing: 'Parsing Diff & AST',
  blast_radius: 'Tracing Blast Radius',
  fuzz_construction: 'Constructing Edge Cases',
  test_synthesis: 'Synthesizing Tests',
  test_execution: 'Executing Tests',
  remediation: 'Generating Patch',
  complete: 'Complete',
  error: 'Error',
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'text-green-400 bg-green-400/10 border-green-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export const RISK_GLOW: Record<RiskLevel, string> = {
  low: 'glow-green',
  medium: 'glow-yellow',
  high: 'glow-orange',
  critical: 'glow-red',
}

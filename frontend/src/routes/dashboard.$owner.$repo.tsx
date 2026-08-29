// Per-repo view — GitHub PR list style
import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { NavBar } from '~/components/NavBar'
import { StatusStepper } from '~/components/StatusStepper'
import { RiskBadge } from '~/components/RiskBadge'
import type { AnalysisReport, AnalysisStatus } from '~/types'
import { useDashboardStore } from '~/store'

export const Route = createFileRoute('/dashboard/$owner/$repo')({
  component: RepoDashboard,
})

function RepoDashboard() {
  const { owner, repo } = Route.useParams()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gh-canvas)' }}>
      <NavBar />

      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--gh-border)' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 text-sm mb-2"
            aria-label="Breadcrumb"
          >
            <Link
              to="/dashboard"
              style={{ color: 'var(--gh-accent)' }}
              className="hover:underline"
            >
              Dashboard
            </Link>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--gh-text-subtle)">
              <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L10.19 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
            <span style={{ color: 'var(--gh-text-muted)' }}>{owner}</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--gh-text-subtle)">
              <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L10.19 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
            <span className="font-semibold" style={{ color: 'var(--gh-text)' }}>
              {repo}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <React.Suspense fallback={<LoadingSkeleton />}>
          <RepoContent owner={owner} repoName={repo} />
        </React.Suspense>
      </div>
    </div>
  )
}

function RepoContent({ owner, repoName }: { owner: string; repoName: string }) {
  const { setSelectedId } = useDashboardStore()
  const fullName = `${owner}/${repoName}`

  const { data: repoDoc } = useSuspenseQuery(
    convexQuery(api.github.getRepoByFullName, { fullName }),
  )
  const { data: pullRequests } = useSuspenseQuery(
    convexQuery(
      api.github.listPullRequests,
      repoDoc ? { repoId: repoDoc._id } : ('skip' as any),
    ),
  )
  const { data: analyses } = useSuspenseQuery(
    convexQuery(api.analyses.listAnalyses, {}),
  )

  const createAnalysis = useMutation(api.analyses.createAnalysis)
  const updateAnalysisStatus = useMutation(api.analyses.updateAnalysisStatus)
  const [submitting, setSubmitting] = React.useState<string | null>(null)

  async function handleAnalyzePR(pr: {
    _id: string
    prNumber: number
    title: string
    diffContent?: string
  }) {
    if (!pr.diffContent) {
      alert('Diff not yet fetched for this PR. Please wait a moment and retry.')
      return
    }
    setSubmitting(pr._id)
    let analysisId: string | null = null
    try {
      const id = await createAnalysis({
        pr_title: pr.title,
        diff: pr.diffContent,
        target_framework: 'pytest',
        pullRequestId: pr._id as any,
        source: 'github_pr',
      })
      analysisId = id
      setSelectedId(id)

      await updateAnalysisStatus({
        id,
        status: 'parsing',
      })

      const backendUrl =
        (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000'

      const response = await fetch(`${backendUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diff: pr.diffContent,
          pr_title: pr.title,
          target_framework: 'pytest',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Backend error ${response.status}: ${errorText}`)
      }

      const report = await response.json()

      await updateAnalysisStatus({
        id,
        status: 'complete',
        report: JSON.stringify(report),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('PR analysis failed:', err)
      if (analysisId) {
        await updateAnalysisStatus({
          id: analysisId as any,
          status: 'error',
          error_message: msg,
        })
      }
    } finally {
      setSubmitting(null)
    }
  }

  const prAnalysisMap = React.useMemo(() => {
    const map = new Map<string, (typeof analyses)[number]>()
    for (const a of analyses) {
      if (a.pullRequestId && !map.has(a.pullRequestId)) {
        map.set(a.pullRequestId, a)
      }
    }
    return map
  }, [analyses])

  if (!repoDoc) {
    return (
      <div className="gh-flash-warn text-sm" style={{ color: 'var(--gh-orange-text)' }}>
        Repository <code className="gh-code">{fullName}</code> not found in Convex.{' '}
        <Link to="/dashboard" style={{ color: 'var(--gh-accent)' }}>
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Repo info bar */}
      <div
        className="gh-card px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--gh-text-muted)">
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z" />
          </svg>
          <span className="font-semibold text-sm" style={{ color: 'var(--gh-text)' }}>
            {fullName}
          </span>
          {repoDoc.private && (
            <span
              className="gh-label"
              style={{
                background: 'var(--gh-surface-2)',
                color: 'var(--gh-text-muted)',
                border: '1px solid var(--gh-border)',
                fontSize: 11,
              }}
            >
              Private
            </span>
          )}
        </div>
        <a
          href={repoDoc.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gh-btn text-xs"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
          </svg>
          View on GitHub
        </a>
      </div>

      {/* PR list */}
      <section>
        {/* Filter tabs (GitHub-style) */}
        <div
          className="flex items-center gap-0 mb-0"
          style={{ borderBottom: '1px solid var(--gh-border)' }}
        >
          <button
            className="px-4 py-2 text-sm font-semibold border-b-2 -mb-px"
            style={{
              color: 'var(--gh-text)',
              borderColor: '#f78166',
              background: 'transparent',
              cursor: 'default',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="var(--gh-green-text)"
              style={{ display: 'inline', marginRight: 4 }}
            >
              <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
            </svg>
            Pull requests{' '}
            <span
              className="gh-label ml-1"
              style={{
                background: 'var(--gh-surface-2)',
                color: 'var(--gh-text-muted)',
                border: '1px solid var(--gh-border)',
              }}
            >
              {pullRequests?.length ?? 0}
            </span>
          </button>
        </div>

        {!pullRequests || pullRequests.length === 0 ? (
          <div
            className="gh-card p-8 text-center text-sm"
            style={{
              color: 'var(--gh-text-muted)',
              borderTop: 'none',
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 16 16"
              fill="var(--gh-text-muted)"
              style={{ margin: '0 auto 8px' }}
            >
              <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Z" />
            </svg>
            No pull requests tracked yet. Open a PR on GitHub to trigger
            automatic analysis.
          </div>
        ) : (
          <div
            className="gh-card overflow-hidden"
            style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
          >
            {pullRequests.map((pr) => {
              const analysis = prAnalysisMap.get(pr._id)
              const report = analysis?.report
                ? (JSON.parse(analysis.report) as AnalysisReport)
                : null

              return (
                <div
                  key={pr._id}
                  className="flex items-start gap-3 px-4 py-3 gh-row"
                >
                  {/* PR state icon */}
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    <PRStateIcon state={pr.state} />
                  </div>

                  {/* PR info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a
                          href={pr.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold hover:underline"
                          style={{ color: 'var(--gh-text)' }}
                        >
                          {pr.title}
                        </a>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--gh-text-muted)' }}
                        >
                          #{pr.prNumber} opened by{' '}
                          <span style={{ color: 'var(--gh-text)' }}>
                            @{pr.author}
                          </span>{' '}
                          · {pr.headSha.slice(0, 7)}
                        </p>
                      </div>

                      {/* Right side: risk / status + action */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {report ? (
                          <Link
                            to="/analysis/$id"
                            params={{ id: analysis!._id }}
                          >
                            <RiskBadge
                              level={report.blast_radius.risk_level}
                              score={report.blast_radius.risk_score}
                            />
                          </Link>
                        ) : analysis ? (
                          <StatusStepper
                            status={analysis.status as AnalysisStatus}
                          />
                        ) : null}

                        {!analysis ? (
                          <button
                            onClick={() => handleAnalyzePR(pr)}
                            disabled={submitting === pr._id || !pr.diffContent}
                            className="gh-btn-primary text-xs"
                            style={{ padding: '3px 12px' }}
                          >
                            {submitting === pr._id
                              ? 'Starting…'
                              : !pr.diffContent
                                ? 'Fetching…'
                                : 'Analyze'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAnalyzePR(pr)}
                            disabled={submitting === pr._id || !pr.diffContent}
                            className="gh-btn text-xs"
                            style={{ padding: '3px 12px' }}
                          >
                            Re-run
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function PRStateIcon({ state }: { state: string }) {
  if (state === 'open') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--gh-green-text)">
        <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
      </svg>
    )
  }
  if (state === 'merged') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--gh-purple-text)">
        <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218Z" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--gh-red-text)">
      <path d="M3.25 1A2.25 2.25 0 0 1 5.5 3.25v9.5a2.25 2.25 0 1 1-4.5 0V3.25A2.25 2.25 0 0 1 3.25 1Zm9.5 5.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="gh-skeleton h-12" />
      <div className="gh-card overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 gh-skeleton m-px" />
        ))}
      </div>
    </div>
  )
}

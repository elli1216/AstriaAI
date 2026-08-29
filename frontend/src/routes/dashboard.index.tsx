// Main dashboard — GitHub Primer-styled
import * as React from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useConvexAuth, useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { NavBar } from '~/components/NavBar'
import { RiskBadge } from '~/components/RiskBadge'
import { StatusStepper } from '~/components/StatusStepper'
import type { AnalysisReport, AnalysisStatus } from '~/types'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
})

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/astria-ai-eli'

function DashboardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  if (!isLoading && !isAuthenticated) {
    void redirect({ to: '/login' })
    return null
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--gh-canvas)' }}
    >
      <NavBar />
      {/* GitHub-style page header */}
      <div style={{ borderBottom: '1px solid var(--gh-border)' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-5 flex items-center justify-between">
          <h1
            className="font-semibold"
            style={{ fontSize: 20, color: 'var(--gh-text)' }}
          >
            Dashboard
          </h1>
          <a href={GITHUB_APP_INSTALL_URL} className="gh-btn-primary text-xs">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
            </svg>
            Add repositories
          </a>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <React.Suspense fallback={<LoadingSkeleton />}>
          <DashboardContent />
        </React.Suspense>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { data: installations } = useSuspenseQuery(
    convexQuery(api.github.listInstallations, {}),
  )
  const { data: analyses } = useSuspenseQuery(
    convexQuery(api.analyses.listAnalyses, {}),
  )
  const linkInstallations = useAction(api.github.linkInstallationsToUser)
  const viewer = useQuery(api.auth.viewer)

  const [searchQuery, setSearchQuery] = React.useState('')
  const [riskFilter, setRiskFilter] = React.useState<'all' | 'high_critical' | 'low_clean'>('all')
  const [isSyncingAll, setIsSyncingAll] = React.useState(false)

  async function handleSyncAllRepos() {
    setIsSyncingAll(true)
    try {
      const backendUrl =
        (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000'
      const res = await fetch(`${backendUrl}/github/sync-all`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to sync repositories')
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`)
    } finally {
      setIsSyncingAll(false)
    }
  }

  // Once we know the user's GitHub login, claim any unclaimed installations
  React.useEffect(() => {
    const login = (viewer as any)?.githubLogin ?? (viewer as any)?.name
    if (login) {
      void linkInstallations({ githubLogin: login })
    }
  }, [(viewer as any)?.githubLogin, (viewer as any)?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute summary stats
  const totalAnalyses = analyses.length
  const completedAnalyses = analyses.filter((a) => a.status === 'complete')
  const highRiskCount = completedAnalyses.filter((a) => {
    if (!a.report) return false
    try {
      const parsed = JSON.parse(a.report) as AnalysisReport
      const lvl = parsed.blast_radius?.risk_level
      return lvl === 'high' || lvl === 'critical'
    } catch {
      return false
    }
  }).length

  const filteredAnalyses = React.useMemo(() => {
    return analyses.filter((a) => {
      // Search text match
      const matchesSearch =
        searchQuery.trim() === '' ||
        a.pr_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.target_framework.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      // Risk filter match
      if (riskFilter === 'all') return true

      if (!a.report) return false
      try {
        const parsed = JSON.parse(a.report) as AnalysisReport
        const lvl = parsed.blast_radius?.risk_level
        if (riskFilter === 'high_critical') {
          return lvl === 'high' || lvl === 'critical'
        }
        if (riskFilter === 'low_clean') {
          return lvl === 'low' || lvl === 'medium'
        }
      } catch {
        return false
      }
      return true
    })
  }, [analyses, searchQuery, riskFilter])

  const userName = (viewer as any)?.name ?? (viewer as any)?.githubLogin ?? 'Developer'

  return (
    <div className="flex flex-col gap-8">
      {/* ── Welcome & Workflow Hero ─────────────────────────────────── */}
      <div
        className="gh-card p-6 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(31,111,235,0.08) 0%, rgba(22,27,34,1) 100%)',
          borderColor: 'var(--gh-border)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mb-2">
              <span
                className="gh-label text-xs font-semibold"
                style={{
                  background: 'var(--gh-accent-muted)',
                  color: 'var(--gh-accent)',
                  borderColor: 'rgba(31,111,235,0.3)',
                }}
              >
                Welcome back, {userName}
              </span>
            </div>
            <h2
              className="text-xl sm:text-2xl font-semibold mb-2"
              style={{ color: 'var(--gh-text)' }}
            >
              PR Blast-Radius Control Center
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--gh-text-muted)' }}
            >
              Astria AI runs parallel IBM Granite agents to map breaking changes, generate adversarial payloads, and produce regression tests. You can test git diffs manually or let the GitHub App monitor your repositories automatically.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-shrink-0">
            <Link
              to="/dashboard/manual"
              className="gh-btn-primary text-sm flex items-center gap-2 py-2 px-4 shadow-sm hover:shadow"
            >
              <span>✨</span>
              <span>Manual Diff Studio</span>
            </Link>
            <a
              href={GITHUB_APP_INSTALL_URL}
              className="gh-btn text-sm flex items-center gap-2 py-2 px-4"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
              <span>Add Repos</span>
            </a>
          </div>
        </div>

        {/* ── Summary Stats Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[var(--gh-border)]">
          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--gh-canvas)',
              borderColor: 'var(--gh-border)',
            }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--gh-text-muted)' }}>
              Total Analyses
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--gh-text)' }}>
              {totalAnalyses}
            </div>
          </div>

          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--gh-canvas)',
              borderColor: 'var(--gh-border)',
            }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--gh-text-muted)' }}>
              High / Critical Risks
            </div>
            <div
              className="text-2xl font-bold mt-1"
              style={{ color: highRiskCount > 0 ? 'var(--gh-red-text)' : 'var(--gh-green-text)' }}
            >
              {highRiskCount}
            </div>
          </div>

          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--gh-canvas)',
              borderColor: 'var(--gh-border)',
            }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--gh-text-muted)' }}>
              Connected Accounts
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--gh-text)' }}>
              {installations.length}
            </div>
          </div>

          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--gh-canvas)',
              borderColor: 'var(--gh-border)',
            }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--gh-text-muted)' }}>
              Active AI Model
            </div>
            <div className="text-sm font-semibold mt-2 truncate" style={{ color: 'var(--gh-accent)' }}>
              Granite 4 Small
            </div>
          </div>
        </div>
      </div>

      {/* ── Repositories section ─────────────────────────────────────── */}
      <section className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <h2
              className="font-semibold text-base"
              style={{ color: 'var(--gh-text)' }}
            >
              Monitored Repositories
            </h2>
            <span
              className="gh-label text-xs"
              style={{
                backgroundColor: 'var(--gh-surface-2)',
                color: 'var(--gh-text-muted)',
                borderColor: 'var(--gh-border)',
              }}
            >
              {installations.length} {installations.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSyncAllRepos}
              disabled={isSyncingAll}
              type="button"
              className="gh-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
              title="Sync all connected installations and repositories from GitHub"
            >
              <span className={isSyncingAll ? 'animate-spin inline-block' : ''}>↻</span>
              <span>{isSyncingAll ? 'Syncing Repos…' : 'Sync All Repositories'}</span>
            </button>

            <a
              href={GITHUB_APP_INSTALL_URL}
              className="text-xs font-medium hover:underline flex items-center gap-1"
              style={{ color: 'var(--gh-accent)' }}
            >
              <span>Configure GitHub App</span>
              <span>→</span>
            </a>
          </div>
        </div>

        {installations.length === 0 ? (
          <InstallCTA />
        ) : (
          <div className="flex flex-col gap-4 w-full">
            {installations.map((inst) => (
              <React.Suspense
                key={inst._id}
                fallback={<div className="gh-card p-4 h-28 gh-skeleton w-full" />}
              >
                <InstallationCard installation={inst} />
              </React.Suspense>
            ))}
          </div>
        )}
      </section>

      {/* ── Analyses section ─────────────────────────────────────────── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2
              className="font-semibold text-base"
              style={{ color: 'var(--gh-text)' }}
            >
              Recent Blast Radius Analyses
            </h2>
            <span
              className="gh-label text-xs"
              style={{
                backgroundColor: 'var(--gh-surface-2)',
                color: 'var(--gh-text-muted)',
                borderColor: 'var(--gh-border)',
              }}
            >
              {analyses.length}
            </span>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PR title..."
                className="gh-input text-xs py-1.5 px-3 w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center rounded-md border border-[var(--gh-border)] bg-[var(--gh-surface-2)] p-0.5">
              <button
                onClick={() => setRiskFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  riskFilter === 'all'
                    ? 'bg-[var(--gh-accent)] text-white'
                    : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRiskFilter('high_critical')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  riskFilter === 'high_critical'
                    ? 'bg-[var(--gh-red)] text-white'
                    : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]'
                }`}
              >
                High Risk
              </button>
              <button
                onClick={() => setRiskFilter('low_clean')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  riskFilter === 'low_clean'
                    ? 'bg-[var(--gh-green)] text-white'
                    : 'text-[var(--gh-text-muted)] hover:text-[var(--gh-text)]'
                }`}
              >
                Clean
              </button>
            </div>

            <Link to="/dashboard/manual" className="gh-btn text-xs py-1.5">
              + New Analysis
            </Link>
          </div>
        </div>

        {analyses.length === 0 ? (
          <div
            className="gh-card p-10 text-center flex flex-col items-center gap-4"
            style={{ color: 'var(--gh-text-muted)', fontSize: 14 }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[var(--gh-surface-2)] border border-[var(--gh-border)]">
              🔬
            </div>
            <div>
              <p className="font-semibold text-base text-[var(--gh-text)] mb-1">
                No analyses run yet
              </p>
              <p className="text-xs text-[var(--gh-text-muted)] max-w-sm mx-auto mb-4">
                You can immediately test a diff using the Manual Studio or install the GitHub App to automatically analyze opened PRs.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link to="/dashboard/manual" className="gh-btn-primary text-xs">
                  ✨ Try Manual Studio / Demo
                </Link>
                <a href={GITHUB_APP_INSTALL_URL} className="gh-btn text-xs">
                  Install GitHub App
                </a>
              </div>
            </div>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="gh-card p-8 text-center text-sm text-[var(--gh-text-muted)]">
            No analyses matching your search/filter criteria.{' '}
            <button
              onClick={() => {
                setSearchQuery('')
                setRiskFilter('all')
              }}
              className="text-[var(--gh-accent)] hover:underline ml-1"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="gh-card overflow-hidden shadow-sm">
            {filteredAnalyses.map((a) => {
              const r = a.report
                ? (JSON.parse(a.report) as AnalysisReport)
                : null
              return (
                <Link
                  key={a._id}
                  to="/analysis/$id"
                  params={{ id: a._id }}
                  className="flex items-center justify-between px-4 py-3.5 transition-colors gh-row group"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2.5">
                      {/* Source icon */}
                      {a.source === 'github_pr' ? (
                        <span
                          className="p-1 rounded bg-[var(--gh-surface-2)] text-[var(--gh-accent)] border border-[var(--gh-border)]"
                          title="Triggered via GitHub PR Webhook"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
                          </svg>
                        </span>
                      ) : (
                        <span
                          className="p-1 rounded bg-[var(--gh-surface-2)] text-[var(--gh-purple-text)] border border-[var(--gh-border)]"
                          title="Triggered via Manual Diff Studio"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25Zm3.5 6.75a.75.75 0 0 1 0-1.5h5.5a.75.75 0 0 1 0 1.5Zm0-3a.75.75 0 0 1 0-1.5h7a.75.75 0 0 1 0 1.5Z" />
                          </svg>
                        </span>
                      )}
                      <span
                        className="text-sm font-semibold truncate group-hover:text-[var(--gh-accent)] transition-colors"
                        style={{ color: 'var(--gh-text)' }}
                      >
                        {a.pr_title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--gh-text-muted)]">
                      <span className="font-medium">
                        {a.source === 'github_pr' ? 'GitHub PR' : 'Manual Diff'}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--gh-surface-2)] border border-[var(--gh-border)] text-[var(--gh-text-subtle)]">
                        {a.target_framework}
                      </span>
                      {r?.blast_radius && (
                        <>
                          <span>·</span>
                          <span>
                            {r.blast_radius.impacted_routes?.length ?? 0} route
                            {(r.blast_radius.impacted_routes?.length ?? 0) !== 1 ? 's' : ''} affected
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {r ? (
                      <RiskBadge
                        level={r.blast_radius.risk_level}
                        score={r.blast_radius.risk_score}
                      />
                    ) : (
                      <StatusStepper status={a.status as AnalysisStatus} />
                    )}
                    <span className="text-xs text-[var(--gh-text-subtle)] group-hover:text-[var(--gh-accent)] group-hover:translate-x-0.5 transition-all">
                      →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function InstallationCard({
  installation,
}: {
  installation: {
    _id: string
    accountLogin: string
    accountType: string
    suspended: boolean
    installationId: number
  }
}) {
  const { data: repos } = useSuspenseQuery(
    convexQuery(api.github.listRepos, {
      installationId: installation._id as any,
    }),
  )

  const [repoSearch, setRepoSearch] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 5

  const filteredRepos = React.useMemo(() => {
    if (!repoSearch.trim()) return repos
    const q = repoSearch.toLowerCase().trim()
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q),
    )
  }, [repos, repoSearch])

  const totalPages = Math.max(1, Math.ceil(filteredRepos.length / pageSize))

  React.useEffect(() => {
    setCurrentPage(1)
  }, [repoSearch])

  const paginatedRepos = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRepos.slice(start, start + pageSize)
  }, [filteredRepos, currentPage, pageSize])

  const startIndex = filteredRepos.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filteredRepos.length)

  return (
    <div className="gh-card overflow-hidden w-full">
      {/* Card header */}
      <div
        className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 bg-[var(--gh-surface-2)]"
        style={{ borderBottom: '1px solid var(--gh-border)' }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="var(--gh-text-muted)"
          >
            {installation.accountType === 'Organization' ? (
              <path d="M1.5 14.25c0 .138.112.25.25.25H4v-1.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h2.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25ZM1.75 0h8.5c.966 0 1.75.784 1.75 1.75v12.5a1.75 1.75 0 0 1-1.75 1.75h-8.5A1.75 1.75 0 0 1 0 14.25V1.75C0 .784.784 0 1.75 0ZM3.5 6.25a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm.75 2.25h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM3.5 3.75A.75.75 0 0 1 4.25 3h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM7 6.25A.75.75 0 0 1 7.75 5.5h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 7 6.25ZM7.75 8h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM7 3.75A.75.75 0 0 1 7.75 3h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 7 3.75Z" />
            ) : (
              <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
            )}
          </svg>
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--gh-text)' }}
          >
            {installation.accountLogin}
          </span>
          <span
            className="gh-label text-[11px]"
            style={{
              backgroundColor: 'var(--gh-surface-1)',
              color: 'var(--gh-text-muted)',
              borderColor: 'var(--gh-border)',
            }}
          >
            {installation.accountType}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {repos.length > 3 && (
            <div className="relative">
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Find a repository..."
                className="gh-input text-xs py-1 px-2.5 w-36 sm:w-48"
              />
              {repoSearch && (
                <button
                  onClick={() => setRepoSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <span
            className="gh-label text-xs"
            style={{
              backgroundColor: 'var(--gh-surface-1)',
              color: 'var(--gh-text-muted)',
              borderColor: 'var(--gh-border)',
            }}
          >
            {repos.length} {repos.length === 1 ? 'Repository' : 'Repositories'}
          </span>

          {installation.suspended && (
            <span
              className="gh-label text-xs"
              style={{
                background: 'var(--gh-orange-muted)',
                color: 'var(--gh-orange-text)',
                borderColor: 'rgba(210,153,34,.4)',
              }}
            >
              Suspended
            </span>
          )}
        </div>
      </div>

      {/* Repo list table */}
      <div className="flex flex-col divide-y divide-[var(--gh-border)]">
        {paginatedRepos.map((repo) => (
          <Link
            key={repo._id}
            to="/dashboard/$owner/$repo"
            params={{ owner: repo.owner, repo: repo.name }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 gh-row group transition-colors"
            style={{ textDecoration: 'none' }}
          >
            {/* Left: icon + name + badges */}
            <div className="flex items-center gap-2.5 min-w-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                className="shrink-0"
                fill="var(--gh-text-muted)"
              >
                {repo.private ? (
                  <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm8.25 3.5h-8.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25ZM10.5 6V4a2.5 2.5 0 0 0-5 0v2Z" />
                ) : (
                  <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z" />
                )}
              </svg>

              <span
                className="text-sm font-semibold font-mono truncate group-hover:underline"
                style={{ color: 'var(--gh-accent)' }}
              >
                {repo.fullName}
              </span>

              <span
                className="gh-label text-[11px] shrink-0"
                style={{
                  background: 'var(--gh-surface-2)',
                  color: 'var(--gh-text-muted)',
                  border: '1px solid var(--gh-border)',
                }}
              >
                {repo.private ? 'Private' : 'Public'}
              </span>

              <span
                className="gh-label text-[10px] font-mono shrink-0 hidden sm:inline-flex"
                style={{
                  background: 'transparent',
                  color: 'var(--gh-text-subtle)',
                  border: '1px solid var(--gh-border)',
                }}
              >
                default: {repo.defaultBranch}
              </span>
            </div>

            {/* Right: action link */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--gh-accent)] shrink-0 self-end sm:self-auto font-medium">
              <span>View PRs & Blast Radius</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}

        {filteredRepos.length === 0 && (
          <div
            className="px-4 py-8 text-center text-xs"
            style={{ color: 'var(--gh-text-muted)' }}
          >
            {repoSearch ? (
              <>
                <p className="mb-1 font-medium text-white">No matching repositories found</p>
                <p className="text-gray-400">No repositories match &quot;{repoSearch}&quot;.</p>
              </>
            ) : (
              <>
                <p className="mb-1 font-medium text-white">No repositories synced yet</p>
                <p className="text-gray-400">Click &quot;Sync All Repositories&quot; above to populate repositories from this account.</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pagination controls footer */}
      {filteredRepos.length > pageSize && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-[var(--gh-surface-2)] text-xs"
          style={{ borderTop: '1px solid var(--gh-border)' }}
        >
          <span style={{ color: 'var(--gh-text-muted)' }}>
            Showing <strong style={{ color: 'var(--gh-text)' }}>{startIndex}</strong>–<strong style={{ color: 'var(--gh-text)' }}>{endIndex}</strong> of{' '}
            <strong style={{ color: 'var(--gh-text)' }}>{filteredRepos.length}</strong> repositories
          </span>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              type="button"
              className="gh-btn text-xs py-1 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <span className="font-mono text-xs px-2" style={{ color: 'var(--gh-text-muted)' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              type="button"
              className="gh-btn text-xs py-1 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InstallCTA() {
  return (
    <div
      className="gh-card p-8 sm:p-12 flex flex-col items-center gap-4 text-center w-full"
      style={{ borderStyle: 'dashed' }}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 16 16"
        fill="var(--gh-text-muted)"
      >
        <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
      </svg>
      <div>
        <p
          className="font-semibold mb-1"
          style={{ color: 'var(--gh-text)', fontSize: 16 }}
        >
          Connect your repositories
        </p>
        <p
          className="text-sm max-w-md mx-auto"
          style={{ color: 'var(--gh-text-muted)' }}
        >
          Install the Astria AI GitHub App to automatically analyze pull
          requests as they open. No configuration required.
        </p>
      </div>
      <a href={GITHUB_APP_INSTALL_URL} className="gh-btn-primary py-2 px-4 text-xs font-semibold">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
        </svg>
        Install GitHub App
      </a>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="gh-skeleton h-36" />
        ))}
      </div>
      <div className="gh-card overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 gh-skeleton m-px" />
        ))}
      </div>
    </div>
  )
}

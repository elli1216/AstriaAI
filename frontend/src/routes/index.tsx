// Landing page — GitHub-themed, public
import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { GithubIcon } from '~/components/NavBar'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/astria-ai-eli'

function LandingPage() {
  const { isAuthenticated } = useConvexAuth()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--gh-canvas)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'rgba(13,17,23,0.95)',
          borderBottom: '1px solid var(--gh-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 h-[62px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/astria-logo.png"
              alt="Astria AI Logo"
              className="w-7 h-7 rounded-full object-cover border border-[var(--gh-border)]"
            />
            <span
              className="font-semibold text-sm"
              style={{ color: 'var(--gh-text)' }}
            >
              Astria AI
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className="gh-btn-primary text-sm">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="gh-btn text-sm">
                  Sign in
                </Link>
                <a
                  href={GITHUB_APP_INSTALL_URL}
                  className="gh-btn-primary text-sm"
                >
                  <GithubIcon size={14} />
                  Install App
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <div
          className="pt-12 pb-16 px-4 text-center"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(31,111,235,0.12) 0%, transparent 70%)',
          }}
        >
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 mb-6">
            <span
              className="gh-label"
              style={{
                background: 'var(--gh-accent-muted)',
                color: 'var(--gh-accent)',
                border: '1px solid rgba(31,111,235,0.4)',
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--gh-accent)',
                  display: 'inline-block',
                  animation: 'pulse 2s infinite',
                }}
              />
              Powered by IBM Granite on watsonx.ai
            </span>
          </div>

          {/* Logo with Title */}
          <div className="flex justify-center mb-8">
            <img
              src="/astria-logo.png"
              alt="Astria AI"
              className="w-56 sm:w-72 md:w-80 max-w-full rounded-2xl shadow-2xl transition-transform hover:scale-[1.02] duration-300"
              style={{
                boxShadow: '0 0 50px rgba(56, 139, 253, 0.2)',
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={GITHUB_APP_INSTALL_URL}
              className="gh-btn-primary"
              style={{ fontSize: 15, padding: '10px 24px' }}
            >
              <GithubIcon size={16} />
              Install GitHub App — it's free
            </a>
            <Link
              to="/login"
              className="gh-btn"
              style={{ fontSize: 15, padding: '10px 24px' }}
            >
              Sign in
            </Link>
          </div>

          {/* Fake terminal / PR comment preview */}
          <div
            className="mt-16 max-w-2xl mx-auto text-left"
            style={{
              background: 'var(--gh-surface)',
              border: '1px solid var(--gh-border)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {/* Window chrome */}
            <div
              style={{
                background: 'var(--gh-surface-2)',
                borderBottom: '1px solid var(--gh-border)',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <GithubIcon size={14} />
              <span style={{ color: 'var(--gh-text-muted)', fontSize: 12 }}>
                Astria-ai[bot] commented on PR #42 ·{' '}
                <span style={{ color: 'var(--gh-text-subtle)' }}>just now</span>
              </span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p
                style={{
                  color: 'var(--gh-text)',
                  fontWeight: 600,
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                🧪 Astria AI — Blast Radius Report
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {[
                  {
                    label: 'Risk Level',
                    value: 'CRITICAL',
                    color: 'var(--gh-red-text)',
                  },
                  {
                    label: 'Impacted Routes',
                    value: '4',
                    color: 'var(--gh-text)',
                  },
                  {
                    label: 'Tests Generated',
                    value: '7',
                    color: 'var(--gh-green-text)',
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: 'var(--gh-canvas)',
                      border: '1px solid var(--gh-border)',
                      borderRadius: 6,
                      padding: '8px 12px',
                    }}
                  >
                    <div
                      style={{ color: 'var(--gh-text-muted)', fontSize: 11 }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{ color: s.color, fontSize: 18, fontWeight: 700 }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: 'var(--gh-canvas)',
                  border: '1px solid var(--gh-border)',
                  borderRadius: 6,
                  padding: '10px 14px',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  fontSize: 12,
                  color: 'var(--gh-red-text)',
                }}
              >
                ❌ FAILED test_billing_charge_null_address — billing_address is
                required
              </div>
            </div>
          </div>
        </div>

        {/* ── About Section ────────────────────────────────────────────── */}
        <section
          style={{
            borderTop: '1px solid var(--gh-border)',
            background: 'var(--gh-surface)',
          }}
          className="py-20 px-4"
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span
                className="gh-label mb-3 inline-block"
                style={{
                  background: 'var(--gh-accent-muted)',
                  color: 'var(--gh-accent)',
                  border: '1px solid rgba(31,111,235,0.4)',
                  fontSize: 12,
                }}
              >
                About Astria AI
              </span>
              <h2
                className="font-semibold text-2xl sm:text-3xl mb-4"
                style={{ color: 'var(--gh-text)', lineHeight: 1.3 }}
              >
                What is Astria AI?
              </h2>
              <p
                className="max-w-2xl mx-auto text-base sm:text-lg leading-relaxed"
                style={{ color: 'var(--gh-text-muted)' }}
              >
                Astria AI is an autonomous PR blast-radius analyzer and
                regression test generator powered by IBM Granite on watsonx.ai.
                It analyzes pull request diffs, OpenAPI specs, and database
                schemas in real time to catch invisible breaking changes before
                they reach staging or production.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div
                style={{
                  background: 'var(--gh-canvas)',
                  border: '1px solid var(--gh-border)',
                  borderRadius: 8,
                  padding: '24px',
                }}
              >
                <div
                  className="font-semibold text-base mb-2 flex items-center gap-2"
                  style={{ color: 'var(--gh-text)' }}
                >
                  <span style={{ color: 'var(--gh-accent)' }}>01.</span> Trace
                  Blast Radius
                </div>
                <p
                  style={{
                    color: 'var(--gh-text-muted)',
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Maps code changes across downstream APIs, microservices, and
                  database models to identify all ripple effects across your
                  stack.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--gh-canvas)',
                  border: '1px solid var(--gh-border)',
                  borderRadius: 8,
                  padding: '24px',
                }}
              >
                <div
                  className="font-semibold text-base mb-2 flex items-center gap-2"
                  style={{ color: 'var(--gh-text)' }}
                >
                  <span style={{ color: '#f0883e' }}>02.</span> Fuzz &
                  Synthesize
                </div>
                <p
                  style={{
                    color: 'var(--gh-text-muted)',
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Generates boundary condition payloads (nulls, schema
                  mutations, type mismatches) and synthesizes complete pytest /
                  vitest test suites.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--gh-canvas)',
                  border: '1px solid var(--gh-border)',
                  borderRadius: 8,
                  padding: '24px',
                }}
              >
                <div
                  className="font-semibold text-base mb-2 flex items-center gap-2"
                  style={{ color: 'var(--gh-text)' }}
                >
                  <span style={{ color: 'var(--gh-green-text)' }}>03.</span>{' '}
                  Test & Remediate
                </div>
                <p
                  style={{
                    color: 'var(--gh-text-muted)',
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Executes tests in an isolated sandbox to confirm failures,
                  auto-generates 1-click patches, and posts safety reports
                  directly on your PR.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature grid ────────────────────────────────────────────── */}
        <section
          style={{
            borderTop: '1px solid var(--gh-border)',
            borderBottom: '1px solid var(--gh-border)',
          }}
          className="py-16 px-4"
        >
          <div className="max-w-[1280px] mx-auto">
            <h2
              className="text-center mb-10 font-semibold"
              style={{ color: 'var(--gh-text)', fontSize: 20 }}
            >
              Everything you need to ship with confidence
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto">
            <h2
              className="text-center mb-10 font-semibold"
              style={{ color: 'var(--gh-text)', fontSize: 20 }}
            >
              How it works
            </h2>
            <div
              style={{
                background: 'var(--gh-surface)',
                border: '1px solid var(--gh-border)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className="flex gap-4 items-start p-5"
                  style={{
                    borderBottom:
                      i < STEPS.length - 1
                        ? '1px solid var(--gh-border)'
                        : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--gh-accent-muted)',
                      border: '1px solid rgba(31,111,235,.4)',
                      color: 'var(--gh-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p
                      style={{
                        color: 'var(--gh-text)',
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      {step.title}
                    </p>
                    <p style={{ color: 'var(--gh-text-muted)', fontSize: 13 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA banner ───────────────────────────────────────────────── */}
        <section
          style={{ borderTop: '1px solid var(--gh-border)' }}
          className="py-16 px-4 text-center"
        >
          <h2
            className="font-semibold mb-3"
            style={{ color: 'var(--gh-text)', fontSize: 20 }}
          >
            Ready to protect your pipeline?
          </h2>
          <p className="mb-6" style={{ color: 'var(--gh-text-muted)' }}>
            Install in 30 seconds. No config required.
          </p>
          <a
            href={GITHUB_APP_INSTALL_URL}
            className="gh-btn-primary"
            style={{ fontSize: 15, padding: '8px 24px' }}
          >
            <GithubIcon size={16} />
            Install GitHub App
          </a>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--gh-border)',
          padding: '24px 16px',
          textAlign: 'center',
          color: 'var(--gh-text-subtle)',
          fontSize: 12,
        }}
      >
        © {new Date().getFullYear()} Astria AI · Built with IBM Bob
      </footer>
    </div>
  )
}

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="var(--gh-accent)">
        <path d="M4.75 2a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5ZM2 5.75A.75.75 0 0 1 2.75 5h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 5.75Zm0 3A.75.75 0 0 1 2.75 8h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8.75Zm.75 2.75a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" />
      </svg>
    ),
    title: 'Blast Radius Tracing',
    desc: 'Maps every downstream route, service, and model broken by your change.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="#f0883e">
        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
      </svg>
    ),
    title: 'Edge-Case Payloads',
    desc: 'Generates null-safety, type mismatch, and schema violation test data.',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 16 16"
        fill="var(--gh-green-text)"
      >
        <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM.5 8a7.5 7.5 0 1 0 15 0A7.5 7.5 0 0 0 .5 8Zm7-3.25v2.5l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.75-1.75a.75.75 0 0 1-.22-.53v-2.78a.75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
    title: 'Regression Tests',
    desc: 'Produces runnable pytest / vitest suites with strict assertions.',
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 16 16"
        fill="var(--gh-purple-text)"
      >
        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286Z" />
      </svg>
    ),
    title: '1-Click Patches',
    desc: 'Auto-generates fixes for caught regressions directly on your PR.',
  },
]

const STEPS = [
  {
    title: 'Install the GitHub App',
    desc: 'Grant access to your repositories. Astria AI listens for new PRs automatically.',
  },
  {
    title: 'Open a pull request',
    desc: 'The app receives the webhook, fetches the diff, and kicks off analysis.',
  },
  {
    title: 'Parallel Granite agents run',
    desc: 'Blast Radius Tracer, Fuzz Constructor, and Test Synthesizer run concurrently via IBM Granite.',
  },
  {
    title: 'Report posted to your PR',
    desc: 'Risk score, impact graph, synthesized tests, and optional 1-click patch committed back.',
  },
]

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div
      style={{
        background: 'var(--gh-surface)',
        border: '1px solid var(--gh-border)',
        borderRadius: 6,
        padding: '20px',
      }}
    >
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <p
        style={{
          color: 'var(--gh-text)',
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 4,
        }}
      >
        {title}
      </p>
      <p
        style={{ color: 'var(--gh-text-muted)', fontSize: 13, lineHeight: 1.5 }}
      >
        {desc}
      </p>
    </div>
  )
}

// needed for JSX in data array
import * as React from 'react'

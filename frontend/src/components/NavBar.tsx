import { Link, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function NavBar() {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const viewer = useQuery(api.auth.viewer)

  async function handleSignOut() {
    await signOut()
    void navigate({ to: '/' })
  }

  const userImage = (viewer as any)?.image
  const userName =
    (viewer as any)?.name ?? (viewer as any)?.githubLogin ?? 'Developer'

  return (
    <header
      style={{
        backgroundColor: 'rgba(13,17,23,0.92)',
        borderBottom: '1px solid var(--gh-border)',
        backdropFilter: 'blur(12px)',
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-[1280px] mx-auto px-4 h-[62px] flex items-center justify-between gap-4">
        {/* Left — logo + primary nav */}
        <div className="flex items-center gap-6">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <img
              src="/astria-logo.png"
              alt="Astria AI Logo"
              className="w-7 h-7 rounded-full object-cover border border-[var(--gh-border)] group-hover:border-[var(--gh-accent)] transition-all"
            />
            <span
              className="font-semibold text-sm tracking-wide flex items-center gap-1.5"
              style={{ color: 'var(--gh-text)' }}
            >
              Astria AI
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: 'var(--gh-accent-muted)',
                  color: 'var(--gh-accent)',
                  border: '1px solid rgba(31,111,235,0.3)',
                }}
              >
                Granite 4
              </span>
            </span>
          </Link>

          {isAuthenticated && (
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ color: 'var(--gh-text-muted)' }}
                activeProps={{
                  style: {
                    color: 'var(--gh-text)',
                    backgroundColor: 'var(--gh-surface-2)',
                  },
                }}
              >
                Dashboard
              </Link>
              <Link
                to="/dashboard/manual"
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ color: 'var(--gh-text-muted)' }}
                activeProps={{
                  style: {
                    color: 'var(--gh-text)',
                    backgroundColor: 'var(--gh-surface-2)',
                  },
                }}
              >
                Manual Studio
              </Link>
            </nav>
          )}
        </div>

        {/* Right — actions & auth controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--gh-border)]">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName}
                    className="w-6 h-6 rounded-full border border-[var(--gh-border)]"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--gh-surface-2)',
                      color: 'var(--gh-text)',
                    }}
                  >
                    {userName[0]?.toUpperCase()}
                  </div>
                )}
                <span
                  className="text-xs font-medium hidden md:inline-block max-w-[120px] truncate"
                  style={{ color: 'var(--gh-text-muted)' }}
                >
                  {userName}
                </span>
                <button
                  onClick={handleSignOut}
                  className="gh-btn text-xs py-1 px-2.5 ml-1"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="gh-btn text-xs">
              <GithubIcon size={14} />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  )
}

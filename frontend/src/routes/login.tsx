// Login page — GitHub OAuth sign-in via Convex Auth
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import * as React from 'react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: '/dashboard' })
    }
  }, [isAuthenticated, navigate])

  async function handleGitHubSignIn() {
    setLoading(true)
    setError(null)
    try {
      await signIn('github')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="glass rounded-3xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">⚡</span>
          <span className="text-xl font-bold text-white">Astria AI</span>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-white mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-gray-400">
            Sign in with GitHub to access your dashboard
          </p>
        </div>

        <button
          onClick={handleGitHubSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <GithubIcon />
          {loading ? 'Signing in…' : 'Continue with GitHub'}
        </button>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <p className="text-xs text-gray-500 text-center">
          By signing in you agree to our terms. Your GitHub profile and
          repository access are used only to power the analysis.
        </p>
      </div>
    </div>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

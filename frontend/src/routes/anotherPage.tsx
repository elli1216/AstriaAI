import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/anotherPage')({
  component: () => (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-gray-300">
      <p>This page is unused.</p>
      <Link to="/" className="text-blue-400 underline hover:no-underline">
        ← Back to dashboard
      </Link>
    </div>
  ),
})

import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL as string
  if (!CONVEX_URL) console.error('missing envar VITE_CONVEX_URL')

  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 5000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: {
        queryClient,
        // auth will be filled in by the root route loader
        auth: undefined as any,
      },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
      defaultErrorComponent: ({ error }) => (
        <div className="flex items-center justify-center h-screen text-red-400 p-8">
          <pre className="text-xs">{String(error)}</pre>
        </div>
      ),
      defaultNotFoundComponent: () => (
        <div className="flex items-center justify-center h-screen text-gray-400">
          Page not found
        </div>
      ),
      Wrap: ({ children }) => (
        <ConvexAuthProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexAuthProvider>
      ),
    }),
    queryClient,
  )

  return router
}

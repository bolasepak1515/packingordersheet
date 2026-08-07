import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 min before refetch
      gcTime: 1000 * 60 * 30,          // 30 min cache retention
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 2,
      structuralSharing: true,        // preserve reference equality when data unchanged
    },
    mutations: {
      retry: 0,                        // writes are not retried by default
    },
  },
})

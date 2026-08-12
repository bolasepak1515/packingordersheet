import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { queryClient } from '@/lib/queryClient'
import { idbStorage } from '@/lib/idbStorage'
import './index.css'
import App from './App'

const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: 'packingordersheet-query-cache',
  throttleTime: 2000,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)

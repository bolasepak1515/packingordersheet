import { useState, useCallback, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ToastContainer, type ToastData } from './Toast'
import { usePrefetchMasterData } from '@/hooks/useMasterData'

const SIDEBAR_W = 240
const SIDEBAR_W_COLLAPSED = 60
const SIDEBAR_KEY = 'packing_sidebar_expanded'

export default function Layout() {
  const [expanded, setExpanded] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    return saved ? JSON.parse(saved) : false
  })
  const [toasts, setToasts] = useState<ToastData[]>([])

  usePrefetchMasterData()

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(expanded))
  }, [expanded])

  const addToast = useCallback((text: string, type: ToastData['type']) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, text, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleToggle = useCallback(() => setExpanded((p: boolean) => !p), [])

  const ml = expanded ? SIDEBAR_W : SIDEBAR_W_COLLAPSED

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar expanded={expanded} onToggle={handleToggle} />
      <div
        style={{
          flex: 1,
          marginLeft: ml,
          background: 'var(--bg)',
          minHeight: '100vh',
          transition: 'margin-left 0.28s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Page content */}
        <main className="page-enter" style={{ flex: 1, padding: '28px 24px' }}>
          <Outlet context={{ addToast } satisfies { addToast: (text: string, type: ToastData['type']) => void }} />
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

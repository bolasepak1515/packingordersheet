import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import Portal from './Portal'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastData {
  id: string
  text: string
  type: ToastType
}

interface Props {
  toast: ToastData
  onDismiss: (id: string) => void
}

const iconMap = {
  success: { icon: CheckCircle, bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
  error: { icon: AlertCircle, bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
  info: { icon: AlertCircle, bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
}

export default function Toast({ toast, onDismiss }: Props) {
  const [exiting, setExiting] = useState(false)
  const cfg = iconMap[toast.type]
  const Icon = cfg.icon

  useEffect(() => {
    const timer = setTimeout(() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300) }, 3500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        minWidth: 300, maxWidth: 420,
        transition: 'all 0.3s ease',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(100%)' : 'translateX(0)',
      }}
    >
      <Icon size={18} color={cfg.color} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: cfg.color, flex: 1, lineHeight: 1.4 }}>{toast.text}</span>
      <button onClick={() => onDismiss(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cfg.color, padding: 2, display: 'flex', opacity: 0.6, flexShrink: 0 }}>
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <Portal>
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
    </Portal>
  )
}

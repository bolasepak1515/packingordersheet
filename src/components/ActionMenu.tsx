import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import Portal from './Portal'

export interface ActionMenuItem {
  label: string
  icon?: React.ElementType
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  loading?: boolean
  title?: string
}

interface Props {
  items: ActionMenuItem[]
  align?: 'left' | 'right'
  title?: string
}

const MENU_W = 190
const ITEM_H = 34

export default function ActionMenu({ items, align = 'right', title = 'Actions' }: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const menuH = items.length * ITEM_H + 12
    const spaceBelow = window.innerHeight - r.bottom
    const top = spaceBelow > menuH + 8 ? r.bottom + 4 : Math.max(8, r.top - menuH - 4)
    const left = align === 'right' ? r.right - MENU_W : Math.max(8, r.left)
    setPos({ top, left })
  }, [open, items.length, align])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node)) return
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  function itemClick(it: ActionMenuItem) {
    if (it.disabled || it.loading) return
    setOpen(false)
    it.onClick()
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: open ? 'var(--bg-hover)' : 'none', color: 'var(--text-secondary)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'none' }}
      >
        <MoreVertical size={18} />
      </button>
      {open && pos && (
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed', top: pos.top, left: pos.left, width: MENU_W,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.25)',
              padding: 6, zIndex: 1200,
            }}
          >
            {items.map((it, i) => {
              const inactive = it.disabled || it.loading
              return (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    disabled={inactive}
                    title={it.title}
                    onClick={(e) => { e.stopPropagation(); itemClick(it) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 10px', borderRadius: 8, border: 'none',
                    cursor: inactive ? 'not-allowed' : 'pointer',
                    background: 'none', fontSize: 13, fontWeight: 500,
                    color: it.danger ? '#dc2626' : 'var(--text-primary)',
                    opacity: inactive ? 0.45 : 1,
                  }}
                  onMouseEnter={(e) => { if (!inactive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  {it.icon && <it.icon size={15} strokeWidth={2} />}
                  {it.label}
                </button>
              )
            })}
          </div>
        </Portal>
      )}
    </>
  )
}

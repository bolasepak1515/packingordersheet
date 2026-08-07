import { useState, useRef } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  showFilters?: boolean
  onToggleFilters?: () => void
  quickFilters?: ReactNode
}

export default function SearchBox({
  value,
  onChange,
  placeholder = 'Search...',
  showFilters,
  onToggleFilters,
  quickFilters,
}: Props) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'stretch', width: '100%' }}>
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg)',
          border: `1.5px solid ${focused ? 'var(--border-focus)' : 'var(--border)'}`,
          borderRadius: 100,
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          boxShadow: focused ? '0 0 0 3px rgba(24,24,27,0.08)' : 'none',
        }}
      >
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: 12,
            color: focused ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            pointerEvents: 'none',
            transition: 'color 0.18s ease',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? '' : placeholder}
          style={{
            width: '100%',
            padding: '8px 32px 8px 36px',
            border: 'none',
            borderRadius: 100,
            fontSize: 13,
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
          }}
        />
        {value && (
          <button
            onClick={() => { onChange(''); inputRef.current?.focus() }}
            style={{
              position: 'absolute',
              right: 4,
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: '50%',
              background: focused ? 'var(--bg-hover)' : 'transparent',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = focused ? 'var(--bg-hover)' : 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
          >
            <X size={13} />
          </button>
        )}
      </div>
      {onToggleFilters && (
        <button
          onClick={onToggleFilters}
          title="Toggle filters"
          style={{
            padding: '8px 14px',
            background: showFilters ? 'var(--accent)' : 'var(--bg-card)',
            color: showFilters ? '#fff' : 'var(--text-secondary)',
            border: `1.5px solid ${showFilters ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 100,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>
      )}
      {quickFilters}
    </div>
  )
}

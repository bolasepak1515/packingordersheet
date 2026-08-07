import type { ReactNode, ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
  children?: ReactNode
}

const variantStyles: Record<Variant, { bg: string; bgHover: string; color: string; border: string; shadow: string }> = {
  primary: {
    bg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    bgHover: 'linear-gradient(135deg, #4f46e5, #4338ca)',
    color: '#fff',
    border: 'none',
    shadow: '0 2px 8px rgba(99,102,241,0.3)',
  },
  secondary: {
    bg: '#f4f4f5',
    bgHover: '#e4e4e7',
    color: '#18181b',
    border: '1px solid #e4e4e7',
    shadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  danger: {
    bg: '#ef4444',
    bgHover: '#dc2626',
    color: '#fff',
    border: 'none',
    shadow: '0 2px 8px rgba(239,68,68,0.3)',
  },
  success: {
    bg: '#16a34a',
    bgHover: '#15803d',
    color: '#fff',
    border: 'none',
    shadow: '0 2px 8px rgba(22,163,74,0.3)',
  },
  warning: {
    bg: '#f59e0b',
    bgHover: '#d97706',
    color: '#fff',
    border: 'none',
    shadow: '0 2px 8px rgba(245,158,11,0.3)',
  },
  ghost: {
    bg: 'transparent',
    bgHover: '#f4f4f5',
    color: '#18181b',
    border: 'none',
    shadow: 'none',
  },
}

const sizeStyles: Record<Size, { padding: string; fontSize: string; gap: string; iconSize: number }> = {
  xs: { padding: '3px 8px', fontSize: '11px', gap: '4px', iconSize: 12 },
  sm: { padding: '5px 12px', fontSize: '12px', gap: '5px', iconSize: 13 },
  md: { padding: '8px 16px', fontSize: '13px', gap: '6px', iconSize: 14 },
  lg: { padding: '10px 20px', fontSize: '14px', gap: '8px', iconSize: 16 },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading,
  children,
  disabled,
  style,
  onClick,
  ...rest
}: Props) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 500,
        fontFamily: 'inherit',
        borderRadius: 100,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.18s ease',
        whiteSpace: 'nowrap',
        background: variant === 'primary' && !disabled ? v.bg : disabled ? '#f4f4f5' : v.bg,
        color: disabled ? '#a1a1aa' : v.color,
        border: v.border,
        boxShadow: disabled ? 'none' : v.shadow,
        textDecoration: 'none',
        lineHeight: 1.4,
        outline: 'none',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = v.bgHover
          if (variant !== 'ghost') e.currentTarget.style.boxShadow = `0 4px 12px ${v.shadow.replace('0 2px 8px', '0 4px 12px')}`
          if (variant === 'ghost') e.currentTarget.style.background = '#f4f4f5'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = disabled ? '#f4f4f5' : variant === 'primary' ? v.bg : v.bg
          if (variant !== 'ghost') e.currentTarget.style.boxShadow = v.shadow
          if (variant === 'ghost') e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
          <svg width={s.iconSize} height={s.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'btnSpin 0.6s linear infinite' }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
          </svg>
          {children}
        </span>
      ) : (
        <>
          {Icon && <Icon size={s.iconSize} />}
          {children}
        </>
      )}
    </button>
  )
}

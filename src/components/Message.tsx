import type { FlashMessage } from '@/types'

const styles = {
  success: {
    bg: 'var(--success-bg)',
    border: 'var(--success-border)',
    text: 'var(--success-text)',
    icon: '\u2713',
  },
  error: {
    bg: 'var(--error-bg)',
    border: 'var(--error-border)',
    text: 'var(--error-text)',
    icon: '\u2717',
  },
}

export default function Message({ msg }: { msg: FlashMessage | null }) {
  if (!msg) return null
  const s = styles[msg.type]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        marginBottom: 16,
        fontSize: 13,
        fontWeight: 500,
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          background: s.text,
          color: s.bg,
          flexShrink: 0,
        }}
      >
        {s.icon}
      </span>
      {msg.text}
    </div>
  )
}

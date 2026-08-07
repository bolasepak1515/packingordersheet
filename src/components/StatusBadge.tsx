export default function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 10px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 500,
        background: active ? 'var(--success-bg)' : 'var(--bg-hover)',
        color: active ? 'var(--success-text)' : 'var(--text-tertiary)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: active ? 'var(--success)' : 'var(--text-tertiary)',
          flexShrink: 0,
        }}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

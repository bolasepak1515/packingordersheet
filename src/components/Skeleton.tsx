interface Props {
  rows?: number
  cols?: number
}

const shine = `
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
`

export function TableSkeleton({ rows = 8, cols = 5 }: Props) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <style>{shine}</style>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          height: 14,
          width: 160,
          borderRadius: 4,
          background: 'linear-gradient(90deg, #e4e4e7 25%, #f4f4f5 50%, #e4e4e7 75%)',
          backgroundSize: '200px 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }} />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'flex',
          gap: 16,
          padding: '12px 16px',
          borderBottom: r < rows - 1 ? '1px solid var(--border)' : 'none',
          background: r % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)',
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{
              flex: 1,
              height: 12,
              borderRadius: 4,
              background: 'linear-gradient(90deg, #e4e4e7 25%, #f4f4f5 50%, #e4e4e7 75%)',
              backgroundSize: '200px 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              animationDelay: `${(r * cols + c) * 0.05}s`,
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function RowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 12,
            borderRadius: 4,
            background: 'linear-gradient(90deg, #e4e4e7 25%, #f4f4f5 50%, #e4e4e7 75%)',
            backgroundSize: '200px 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </span>
  )
}

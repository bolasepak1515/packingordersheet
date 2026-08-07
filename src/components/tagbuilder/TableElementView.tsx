import type { TagElement, PackingSheetColumn } from './types'

interface Props {
  el: TagElement
  rows?: string[][]
}

function scaleWidths(columns: PackingSheetColumn[], total: number): number[] {
  const sum = columns.reduce((s, c) => s + (c.width || 10), 0)
  if (sum <= 0) return columns.map(() => total / Math.max(columns.length, 1))
  return columns.map((c) => Math.max(2, (c.width * total) / sum))
}

export default function TableElementView({ el, rows }: Props) {
  const columns = el.tableColumns ?? []
  const headerRows = columns.some((c) => (c.sublabel ?? '') !== '') ? 2 : 1

  const groups: PackingSheetColumn[][] = []
  for (const c of columns) {
    const last = groups[groups.length - 1]
    if (last && last[0].label === c.label) last.push(c)
    else groups.push([c])
  }
  const subGroupIds = new Set<string>()
  for (const g of groups) {
    if (g.some((c) => (c.sublabel ?? '') !== '')) {
      for (const c of g) subGroupIds.add(c.id)
    }
  }

  const widths = scaleWidths(columns, el.width)
  const headerFont = el.tableHeaderFontSize ?? 12
  const bodyFont = el.tableBodyFontSize ?? 13
  const rowHeight = el.tableRowHeight ?? 40
  const headerBg = el.tableHeaderBg ?? '#f5f5f5'

  const thStyle: React.CSSProperties = {
    border: '1px solid #000',
    background: headerBg,
    padding: '2px 2px',
    overflow: 'hidden',
    fontWeight: 700,
  }
  const tdStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '1px 2px',
    overflow: 'hidden',
    height: rowHeight,
    whiteSpace: 'nowrap',
  }

  const colgroup = columns.map((c, i) => (
    <col key={c.id || i} style={{ width: widths[i] }} />
  ))

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#fff' }}>
      <table style={{ width: '100%', height: 'auto', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>{colgroup}</colgroup>
        <thead>
          <tr>
            {groups.map((g, gi) => {
              const gHasSub = g.some((c) => (c.sublabel ?? '') !== '')
              const cell: React.CSSProperties = {
                ...thStyle,
                fontSize: headerFont,
                textAlign: (g[0].align ?? 'center') as React.CSSProperties['textAlign'],
              }
              if (gHasSub) return <th key={gi} colSpan={g.length} style={cell}>{g[0].label || '\u00A0'}</th>
              return <th key={gi} rowSpan={2} style={cell}>{g[0].label || '\u00A0'}</th>
            })}
          </tr>
          {headerRows === 2 && (
            <tr>
              {columns.filter((c) => subGroupIds.has(c.id)).map((c, i) => (
                <th key={c.id || i} style={{ ...thStyle, fontSize: headerFont, textAlign: 'center' }}>
                  {c.sublabel || '\u00A0'}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {(rows ?? []).map((r, ri) => (
            <tr key={ri}>
              {columns.map((c, ci) => (
                <td key={c.id || ci} style={{ ...tdStyle, fontSize: bodyFont, textAlign: (c.align ?? 'center') as React.CSSProperties['textAlign'] }}>
                  {r[ci] ?? '\u00A0'}
                </td>
              ))}
            </tr>
          ))}
          {!rows && (
            <tr>
              <td colSpan={columns.length} style={{ ...tdStyle, textAlign: 'center', color: '#999', fontSize: 11 }}>
                Table — {columns.length} columns · data-driven rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

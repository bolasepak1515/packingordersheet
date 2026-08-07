import { describe, it, expect } from 'vitest'
import { buildSheetRows, buildRawRows, buildSizeMatrixRows, renderTable, isSizeGroupTable } from './generatePackingSheetPdf'
import type { TagElement, PackingSheetColumn } from '@/components/tagbuilder/types'
import type { OutRow } from './generatePackingSheetPdf'

const mm = (v: number) => v

const entry = (partNum: string, qty: string, size: string, start: number, end: number, brand = 'NPF35', packBy = 'MFGSYS') => ({
  partNum,
  size,
  customer: 'X',
  qty,
  cartonNo: `K1 ${String(start).padStart(4, '0')} - K1 ${String(end).padStart(4, '0')}`,
  ctn: String(end - start + 1),
  inner: '100',
  lotInternal: `K1 00001`,
  palletNo: '00001',
  brand,
  packBy,
})

const cols = (dataKey: string): PackingSheetColumn => ({
  id: 'c1', label: 'Col', sublabel: '', width: 100, dataKey, align: 'center',
})

const table: TagElement = {
  id: 't1', type: 'table', x: 10, y: 90, width: 600, height: 300, rotation: 0,
  tableColumns: [cols('partGroup'), cols('size'), cols('qty')],
  tableRowHeight: 40, tableHeaderFontSize: 12, tableBodyFontSize: 13, tableHeaderBg: '#f5f5f5',
}

describe('buildSheetRows', () => {
  it('groups multiple part numbers sharing a base part group into one row', () => {
    const out = buildSheetRows([
      entry('NURTE-TUR-2.2PFSN-FTCB-S-01', '10', 'S', 1, 5),
      entry('NURTE-TUR-2.2PFSN-FTCB-M-01', '20', 'M', 6, 10),
      entry('NURTE-TUR-2.2PFSN-FTCB-L-01', '30', 'L', 11, 15),
    ])
    expect(out.length).toBe(1)
    expect(out[0].qty).toBe('60')
    expect(out[0].ctn).toBe('15')
    expect(out[0].cartonNo).toBe('K1 0001 - K1 0015')
  })

  it('keeps distinct base part groups as separate rows', () => {
    const out = buildSheetRows([
      entry('ABC-DEF-GH-S-01', '10', 'S', 1, 5),
      entry('XYZ-WXY-ZZ-M-01', '20', 'M', 6, 10),
    ])
    const data = out.filter((r) => !r.separator)
    expect(data.length).toBe(2)
    expect(data[0].qty).toBe('10')
    expect(data[1].qty).toBe('20')
  })

  it('single entry stays a single row with its own values', () => {
    const out = buildSheetRows([entry('NURTE-TUR-2.2PFSN-FTCB-S-01', '10', 'S', 1, 5)])
    expect(out.length).toBe(1)
    expect(out[0].qty).toBe('10')
    expect(out[0].cartonNo).toBe('K1 0001 - K1 0005')
  })

  it('sets partGroup on each grouped row', () => {
    const out = buildSheetRows([entry('NURTE-TUR-2.2PFSN-FTCB-S-01', '10', 'S', 1, 5)])
    expect(out[0].partGroup).toBe('NURTE-TUR-2.2PFSN-FTCB')
  })
})

describe('buildRawRows', () => {
  it('keeps one row per page without grouping', () => {
    const out = buildRawRows([
      entry('NURTE-TUR-2.2PFSN-FTCB-S-01', '10', 'S', 1, 5),
      entry('NURTE-TUR-2.2PFSN-FTCB-M-01', '20', 'M', 6, 10),
    ])
    const data = out.filter((r) => !r.separator)
    expect(data.length).toBe(2)
    expect(data[0].qty).toBe('10')
    expect(data[1].qty).toBe('20')
    expect(data[0].partGroup).toBe('NURTE-TUR-2.2PFSN-FTCB')
  })
})

describe('isSizeGroupTable', () => {
  const t = (labels: string[]): TagElement => ({
    id: 't1', type: 'table', x: 0, y: 0, width: 600, height: 300, rotation: 0,
    tableColumns: labels.map((label) => ({ id: 'c', label, sublabel: '', width: 50, dataKey: '', align: 'center' })),
  })
  it('detects the Part/Size/TotalCtn table', () => {
    expect(isSizeGroupTable(t(['Part', 'XS', 'S', 'M', 'L', 'XL', 'TOTAL CTN']))).toBe(true)
  })
  it('does not group ordinary tables', () => {
    expect(isSizeGroupTable(t(['Loading Sequence', 'Pallet No', 'QTY']))).toBe(false)
    expect(isSizeGroupTable(t(['QTY', 'CTN']))).toBe(false)
  })
})

describe('buildSizeMatrixRows', () => {
  it('groups one row per base part group with per-size ctn and total = sum', () => {
    const out = buildSizeMatrixRows([
      entry('NURTE-TUR-2.2PFSN-FTCB-S-01', '10', 'S', 1, 5),
      entry('NURTE-TUR-2.2PFSN-FTCB-M-01', '20', 'M', 6, 10),
      entry('NURTE-TUR-2.2PFSN-FTCB-L-01', '30', 'L', 11, 15),
    ])
    const data = out.filter((r) => !r.separator && !r.isTotal)
    expect(data.length).toBe(1)
    expect(data[0].partGroup).toBe('NURTE-TUR-2.2PFSN-FTCB')
    expect(data[0].sizes).toEqual({ S: '5', M: '5', L: '5' })
    expect(data[0].total).toBe('15')
    expect(data[0].brand).toBe('NPF35')
    expect(data[0].packBy).toBe('MFGSYS')
  })

  it('splits distinct base part groups into separate rows with separators', () => {
    const out = buildSizeMatrixRows([
      entry('ABC-DEF-GH-S-01', '10', 'S', 1, 5),
      entry('XYZ-WXY-ZZ-M-01', '20', 'M', 6, 10),
    ])
    expect(out.filter((r) => r.separator).length).toBe(1)
    const data = out.filter((r) => !r.separator && !r.isTotal)
    expect(data.length).toBe(2)
    expect(data[0].total).toBe('5')
    expect(data[1].total).toBe('5')
  })

  it('sums ctn across pages of the same size', () => {
    const out = buildSizeMatrixRows([
      entry('NURTE-TUR-2.2PFSN-FTCB-M-01', '25', 'M', 1, 25),
      entry('NURTE-TUR-2.2PFSN-FTCB-M-01', '25', 'M', 26, 50),
    ])
    expect(out[0].sizes).toEqual({ M: '50' })
    expect(out[0].total).toBe('50')
  })

  it('splits the same part group into separate rows when pack by differs', () => {
    const out = buildSizeMatrixRows([
      entry('NURTE-TUR-FTPCPF5.0-S-01', '10', 'S', 1, 5, 'NPF35', '16B'),
      entry('NURTE-TUR-FTPCPF5.0-M-01', '20', 'M', 6, 10, 'NPF35', '16B'),
      entry('NURTE-TUR-FTPCPF5.0-L-01', '30', 'L', 11, 15, 'NPF35', '6061A'),
    ])
    expect(out.filter((r) => r.separator).length).toBe(0)
    const data = out.filter((r) => !r.separator && !r.isTotal)
    expect(data.length).toBe(2)
    expect(data[0].partGroup).toBe('NURTE-TUR-FTPCPF5.0')
    expect(data[0].packBy).toBe('16B')
    expect(data[0].sizes).toEqual({ S: '5', M: '5' })
    expect(data[0].total).toBe('10')
    expect(data[1].partGroup).toBe('NURTE-TUR-FTPCPF5.0')
    expect(data[1].packBy).toBe('6061A')
    expect(data[1].sizes).toEqual({ L: '5' })
    expect(data[1].total).toBe('5')
  })

  it('appends a total row summing the Total (CTN) column', () => {
    const out = buildSizeMatrixRows([
      entry('NURTE-TUR-FTPCPF5.0-S-01', '10', 'S', 1, 5, 'NPF35', '16B'),
      entry('NURTE-TUR-FTPCPF5.0-M-01', '20', 'M', 6, 10, 'NPF35', '6061A'),
    ])
    const last = out[out.length - 1]
    expect(last.isTotal).toBe(true)
    expect(last.partGroup).toBe('Total')
    expect(last.total).toBe('10')
    expect(out.filter((r) => r.isTotal).length).toBe(1)
  })
})

describe('renderTable matrix', () => {
  const matrixTable: TagElement = {
    id: 'm1', type: 'table', x: 10, y: 90, width: 600, height: 300, rotation: 0,
    tableColumns: [
      { id: 'c1', label: 'Part', sublabel: '', width: 100, dataKey: 'partGroup', align: 'center' },
      { id: 'c2', label: 'Brand', sublabel: '', width: 100, dataKey: '', align: 'center' },
      { id: 'c3', label: 'XS', sublabel: '', width: 60, dataKey: '', align: 'center' },
      { id: 'c4', label: 'S', sublabel: '', width: 60, dataKey: '', align: 'center' },
      { id: 'c5', label: 'M', sublabel: '', width: 60, dataKey: '', align: 'center' },
      { id: 'c6', label: 'L', sublabel: '', width: 60, dataKey: '', align: 'center' },
      { id: 'c7', label: 'XL', sublabel: '', width: 60, dataKey: '', align: 'center' },
      { id: 'c8', label: 'Total (CTN)', sublabel: '', width: 60, dataKey: '', align: 'center' },
      { id: 'c9', label: 'Pack By', sublabel: '', width: 60, dataKey: '', align: 'center' },
    ],
    tableRowHeight: 40, tableHeaderFontSize: 12, tableBodyFontSize: 13, tableHeaderBg: '#f5f5f5',
  }

  it('renders per-size values, zeros for missing sizes, total and pack by', () => {
    const out = buildSizeMatrixRows([entry('NURTE-TUR-2.2PFSN-FTCB-S-01', '10', 'S', 1, 5)])
    const html = renderTable(matrixTable, out, mm, {})
    expect(html).toContain('NURTE-TUR-2.2PFSN-FTCB')
    expect(html).toContain('NPF35')
    expect(html).toContain('MFGSYS')
    expect(html.match(/<td[^>]*>0<\/td>/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
    expect(html).toContain('>5<')
  })

  it('renders a grand total row at the end with summed Total (CTN)', () => {
    const out = buildSizeMatrixRows([
      entry('NURTE-TUR-FTPCPF5.0-S-01', '10', 'S', 1, 5, 'NPF35', '16B'),
      entry('NURTE-TUR-FTPCPF5.0-M-01', '20', 'M', 6, 10, 'NPF35', '6061A'),
    ])
    const html = renderTable(matrixTable, out, mm, {})
    const rows = html.split('<tbody>')[1].split('</tbody>')[0].split('<tr>').filter((r) => r.includes('<td'))
    const lastRow = rows[rows.length - 1]
    expect(lastRow).toContain('>Total<')
    expect(lastRow).toContain('>10<')
    expect(lastRow).not.toContain('NPF35')
    expect(lastRow).not.toContain('16B')
  })

  it('renders separator rows in the matrix table', () => {
    const out = buildSizeMatrixRows([
      entry('ABC-DEF-GH-S-01', '10', 'S', 1, 5),
      entry('XYZ-WXY-ZZ-M-01', '20', 'M', 6, 10),
    ])
    const html = renderTable(matrixTable, out, mm, {})
    expect(html).toContain('colspan="9"')
  })
})

describe('renderTable', () => {
  it('renders every row plainly without rowspan', () => {
    const out: OutRow[] = [
      { sequence: 'S1', palletNo: '00001', lotInternal: 'K1 00001', lotCustomer: 'X', size: 'S', qty: '60', cartonNo: 'K1 0001 - K1 0015', ctn: '15', inner: '100', partGroup: 'NURTE-TUR-2.2PFSN-FTCB' },
    ]
    const html = renderTable(table, out, mm, { partGroup: 'NURTE-TUR-2.2PFSN-FTCB' })
    expect(html.match(/NURTE-TUR-2\.2PFSN-FTCB/g)).toHaveLength(1)
    expect(html).not.toContain('rowspan')
  })
})

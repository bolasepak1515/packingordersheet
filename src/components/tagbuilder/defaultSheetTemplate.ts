import type { TagElement, PackingSheetColumn } from './types'

export const SHEET_CANVAS_W = 794
export const SHEET_CANVAS_H = 1123

let _id = 0
function id() { return `el_${++_id}` }

const W = SHEET_CANVAS_W

function col(label: string, sublabel: string | undefined, width: number, dataKey?: string, align: 'left' | 'center' | 'right' = 'center'): PackingSheetColumn {
  return { id: `col_${++_id}`, label, sublabel, width, dataKey, align }
}

export function getDefaultSheetColumns(): PackingSheetColumn[] {
  _id = 0
  return [
    col('Loading Sequence', undefined, 60, 'seq'),
    col('Pallet No', undefined, 38, 'pallet'),
    col('LOT NO', 'INTERNAL', 87, 'lotInternal'),
    col('LOT NO', 'CUSTOMER', 87, 'lotCustomer'),
    col('SIZE', undefined, 38, 'size'),
    col('QTY', undefined, 38, 'qty'),
    col('CARTON NO', undefined, 163, 'cartonNo'),
    col('PACKAGING MATERIAL', 'CTN', 30, 'ctn'),
    col('PACKAGING MATERIAL', 'INNER', 30, 'inner'),
    col('PACKAGING MATERIAL', '', 49, ''),
    col('PACKED CARTON', 'RECORDED', 49, ''),
    col('PACKED CARTON', 'DATE', 49, ''),
    col('LOADED', undefined, 38, ''),
  ]
}

export function getDefaultSheetTemplate(): TagElement[] {
  _id = 0
  const els: TagElement[] = []

  els.push({ id: id(), type: 'text', x: 40, y: 18, width: W - 80, height: 26, rotation: 0, text: 'LOADING SEQUENCE SHEET', fontSize: 26, fontFamily: 'Arial', fontWeight: 'bold', textAlign: 'center', color: '#000000', opacity: 1 })
  els.push({ id: id(), type: 'text', x: 40, y: 52, width: W - 80, height: 18, rotation: 0, text: 'Order : {order}      Company : {company}      Total Pages : {totalPages}      Date : {date}', fontSize: 13, fontFamily: 'Arial', textAlign: 'center', color: '#000000', opacity: 1 })

  const columns = getDefaultSheetColumns()

  const tableWidth = columns.reduce((s, c) => s + c.width, 0)
  els.push({
    id: id(),
    type: 'table',
    x: (W - tableWidth) / 2,
    y: 92,
    width: tableWidth,
    height: 500,
    rotation: 0,
    tableColumns: columns,
    tableRowHeight: 45,
    tableHeaderFontSize: 12,
    tableBodyFontSize: 13,
    tableHeaderBg: '#f5f5f5',
    opacity: 1,
  })

  return els
}

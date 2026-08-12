import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { getWeekNumber } from '@/utils/weekNumber'
import { formatDate, extractSizeFromPartNum, extractBasePartGroup, padNum, parseLineDesc } from '@/utils/format'
import type { JobOrder, PackingOrderTrans, Size } from '@/types'
import { fetchPackingSheetTemplate, fetchSizeLookup, fetchPackingTransByJob } from '@/lib/db'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/hooks/queryKeys'
import type { PackingTransRow } from '@/hooks/useMasterData'
import { getDefaultSheetTemplate, getDefaultSheetColumns } from '@/components/tagbuilder/defaultSheetTemplate'
import { resolveTagElements, renderTagElementHtml, pxToMmScale } from '@/utils/renderTagTemplateHtml'
import type { TagElement, PackingSheetColumn } from '@/components/tagbuilder/types'

const QTY_STD = 25
const QTY_HIGH = 50
// Printable width of A4 with 5mm side margins
const PAGE_WIDTH_MM = 200

export interface Entry {
  partNum: string
  size: string
  customer: string
  qty: string
  cartonNo: string
  ctn: string
  inner: string
  lotInternal: string
  palletNo: string
  brand: string
  packBy: string
}

export interface OutRow {
  sequence: string
  palletNo: string
  lotInternal: string
  lotCustomer: string
  size: string
  qty: string
  cartonNo: string
  ctn: string
  inner: string
  partGroup: string
  separator?: boolean
}

/** Returns the ungrouped page rows (one row per page, separated by size). */
export function buildRawRows(entries: Entry[]): OutRow[] {
  const out: OutRow[] = []
  const counters: Record<string, number> = {}
  let prevSize: string | null = null
  for (const e of entries) {
    const size = e.size || 'X'
    if (prevSize !== null && prevSize !== size) out.push({ separator: true } as OutRow)
    counters[size] = (counters[size] ?? 0) + 1
    out.push({
      sequence: `${size}${counters[size]}`,
      palletNo: e.palletNo,
      lotInternal: e.lotInternal,
      lotCustomer: e.customer,
      size,
      qty: e.qty,
      cartonNo: e.cartonNo,
      ctn: e.ctn,
      inner: e.inner,
      partGroup: extractBasePartGroup(e.partNum),
    })
    prevSize = size
  }
  return out
}

/** Groups page entries by base part group (part number minus size + sequence segments)
 *  and aggregates each group into a single row. */
export function buildSheetRows(entries: Entry[]): OutRow[] {
  const groups = new Map<string, Entry[]>()
  for (const e of entries) {
    const base = extractBasePartGroup(e.partNum)
    if (!groups.has(base)) groups.set(base, [])
    groups.get(base)!.push(e)
  }

  const out: OutRow[] = []
  const counters: Record<string, number> = {}
  let prevGroup: string | null = null
  for (const [base, groupEntries] of groups) {
    if (prevGroup !== null && prevGroup !== base) out.push({ separator: true } as OutRow)
    counters[base] = (counters[base] ?? 0) + 1
    const first = groupEntries[0]
    const last = groupEntries[groupEntries.length - 1]
    const size = first.size || 'X'

    const totalQty = groupEntries.reduce((s, e) => s + (parseInt(e.qty) || 0), 0)
    const totalCtn = groupEntries.reduce((s, e) => s + (parseInt(e.ctn) || 0), 0)
    const totalInner = groupEntries.reduce((s, e) => s + (parseInt(e.inner) || 0), 0)

    let cartonNo = first.cartonNo
    if (groupEntries.length > 1) {
      const lot = first.cartonNo.split(' ')[0]
      const firstStart = first.cartonNo.split(' - ')[0].split(' ').pop()
      const lastEnd = last.cartonNo.split(' - ')[1].split(' ').pop()
      cartonNo = `${lot} ${firstStart} - ${lot} ${lastEnd}`
    }

    out.push({
      sequence: `${size}${counters[base]}`,
      palletNo: first.palletNo,
      lotInternal: first.lotInternal,
      lotCustomer: first.customer,
      size,
      qty: String(totalQty),
      cartonNo,
      ctn: String(totalCtn),
      inner: String(totalInner),
      partGroup: base,
    })
    prevGroup = base
  }
  return out
}

/** True when the table is a size-matrix table (Part + XS/S/M/L/XL + TOTAL CTN columns). */
export function isSizeGroupTable(el: Pick<TagElement, 'tableColumns'>): boolean {
  const labels = (el.tableColumns ?? []).map((c) => (c.label ?? '').trim().toUpperCase())
  const hasPart = labels.includes('PART')
  const hasSize = labels.some((l) => ['XS', 'S', 'M', 'L', 'XL'].includes(l))
  const hasTotalCtn = labels.some((l) => l.startsWith('TOTAL') && l.includes('CTN'))
  return hasPart && (hasSize || hasTotalCtn)
}

export const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL'] as const

export interface SizeMatrixRow {
  partGroup: string
  brand: string
  sizes: Record<string, string>
  total: string
  packBy: string
  separator?: boolean
  isTotal?: boolean
}

/** Aggregates page entries into rows for the size-matrix table
 *  (Part | Brand | XS | S | M | L | XL | Total (CTN) | Pack By).
 *  One row per base part group + Plant Packing combination, so the same part
 *  group split across different packing sites gets its own row.
 *  Size cells hold the summed cartons (ctn) for that size (0 shown for missing
 *  sizes); Total = sum of all sizes in the row. */
export function buildSizeMatrixRows(entries: Entry[]): SizeMatrixRow[] {
  const groups = new Map<string, { base: string; packBy: string; entries: Entry[] }>()
  for (const e of entries) {
    const base = extractBasePartGroup(e.partNum)
    const packBy = e.packBy
    const key = `${base}\u0000${packBy}`
    let g = groups.get(key)
    if (!g) {
      g = { base, packBy, entries: [] }
      groups.set(key, g)
    }
    g.entries.push(e)
  }

  const out: SizeMatrixRow[] = []
  let prevBase: string | null = null
  for (const { base, packBy, entries: groupEntries } of groups.values()) {
    if (prevBase !== null && prevBase !== base) out.push({ separator: true } as SizeMatrixRow)
    prevBase = base

    const sizes: Record<string, string> = {}
    let total = 0
    for (const e of groupEntries) {
      const c = parseInt(e.ctn) || 0
      total += c
      const s = e.size || ''
      if (s) sizes[s] = String((parseInt(sizes[s]) || 0) + c)
    }

    out.push({
      partGroup: base,
      brand: groupEntries[0].brand,
      sizes,
      total: String(total),
      packBy,
    })
  }

  if (out.length > 0) {
    const grandTotal = out
      .filter((r) => !r.separator && !r.isTotal)
      .reduce((s, r) => s + (parseInt(r.total) || 0), 0)
    out.push({ partGroup: 'Total', brand: '', sizes: {}, total: String(grandTotal), packBy: '', isTotal: true })
  }
  return out
}

function generateBarcode(value: string, h = 50, w = 1.5): string {
  if (!value) return ''
  const canvas = document.createElement('canvas')
  try {
    JsBarcode(canvas, value, { format: 'CODE128', width: w, height: h, displayValue: false, margin: 0, background: '#FFFFFF', lineColor: '#000000' })
    const url = canvas.toDataURL('image/png')
    if (url && !url.includes('AAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='))
      return url
    JsBarcode(canvas, value, { format: 'CODE128', width: w, height: h, displayValue: true, margin: 2 })
    return canvas.toDataURL('image/png')
  } catch {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderHeader(columns: PackingSheetColumn[], mm: (v: number, min?: number) => number, headerFont: number, headerBg: string): string {
  const thStyle = (align: string): string =>
    `border:1px solid #000;background:${headerBg};text-align:${align};font-size:${mm(headerFont, 2)}mm;padding:1px 2px;font-weight:700;overflow:hidden`
  const cell = (label: string, align: string): string =>
    `<th style="${thStyle(align)}">${escapeHtml(label) || '&nbsp;'}</th>`

  const hasSub = columns.some((c) => (c.sublabel ?? '') !== '')
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

  let html = '<thead>'
  html += '<tr>' + groups.map((g) => {
    const gHasSub = g.some((c) => (c.sublabel ?? '') !== '')
    const attrs = gHasSub ? `colspan="${g.length}"` : (hasSub ? 'rowspan="2"' : '')
    return `<th ${attrs} style="${thStyle(g[0].align ?? 'center')}">${escapeHtml(g[0].label) || '&nbsp;'}</th>`
  }).join('') + '</tr>'
  if (hasSub) {
    html += '<tr>' + columns
      .filter((c) => subGroupIds.has(c.id))
      .map((c) => cell(c.sublabel ?? '', c.align ?? 'center'))
      .join('') + '</tr>'
  }
  html += '</thead>'
  return html
}

export function renderTable(
  el: TagElement,
  out: OutRow[] | SizeMatrixRow[],
  mm: (v: number, min?: number) => number,
  tokens: Record<string, string>,
): string {
  const columns = el.tableColumns && el.tableColumns.length > 0 ? el.tableColumns : getDefaultSheetColumns()
  const headerFont = el.tableHeaderFontSize ?? 12
  const bodyFont = el.tableBodyFontSize ?? 13
  const rowHeight = el.tableRowHeight ?? 40
  const headerBg = el.tableHeaderBg ?? '#f5f5f5'
  const colSum = columns.reduce((s, c) => s + (c.width || 10), 0)
  const tableWidth = el.width > 0 ? el.width : colSum
  const scale = colSum > 0 ? tableWidth / colSum : 1
  const colWidths = columns.map((c) => Math.max(2, (c.width || 10) * scale))

  const colgroup = `<colgroup>${colWidths.map((w) => `<col style="width:${mm(w, 2)}mm">`).join('')}</colgroup>`

  const tdStyle = (align: string): string =>
    `border:1px solid #000;text-align:${align};vertical-align:middle;font-size:${mm(bodyFont, 2)}mm;padding:1px 2px;height:${mm(rowHeight, 2)}mm;overflow:hidden;white-space:nowrap`

  const valueOf = (r: OutRow, c: PackingSheetColumn): string => {
    if (!c.dataKey) return ''
    const row: Record<string, string> = {
      seq: r.sequence,
      pallet: r.palletNo,
      lotInternal: r.lotInternal,
      lotCustomer: r.lotCustomer,
      size: r.size,
      qty: r.qty,
      cartonNo: r.cartonNo,
      ctn: r.ctn,
      inner: r.inner,
      partGroup: r.partGroup,
    }
    return row[c.dataKey] ?? tokens[c.dataKey] ?? ''
  }

  const matrixValueOf = (r: SizeMatrixRow, c: PackingSheetColumn): string => {
    const label = (c.label ?? '').trim().toUpperCase()
    if (r.isTotal) {
      if (label === 'PART' || c.dataKey === 'partGroup') return r.partGroup
      if (label.startsWith('TOTAL')) return r.total
      return ''
    }
    if (label === 'PART' || c.dataKey === 'partGroup') return r.partGroup
    if (label === 'BRAND') return r.brand
    if (label.startsWith('TOTAL')) return r.total
    if (label === 'PACK BY') return r.packBy
    if ((SIZE_LABELS as readonly string[]).includes(label)) return r.sizes[label] ?? '0'
    return ''
  }

  const isMatrix = isSizeGroupTable(el)

  const body = out.map((r) => {
    if (r.separator) {
      return `<tr><td colspan="${columns.length}" style="${tdStyle('center')}">&nbsp;</td></tr>`
    }
    const tds = columns.map((c) => {
      const val = isMatrix ? matrixValueOf(r as SizeMatrixRow, c) : valueOf(r as OutRow, c)
      const safe = escapeHtml(val) || '&nbsp;'
      return `<td style="${tdStyle(c.align ?? 'center')}">${safe}</td>`
    }).join('')
    return `<tr>${tds}</tr>`
  }).join('')

  return `<div style="position:relative;margin-left:${mm(el.x)}mm;width:${mm(tableWidth)}mm;">` +
    `<table class="sheet" style="width:100%;border-collapse:collapse;table-layout:fixed;">${colgroup}${renderHeader(columns, mm, headerFont, headerBg)}<tbody>${body}</tbody></table></div>`
}

function fullHtml(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Packing Sheet</title>
<style>
@page { size: A4; margin: 5mm; }
* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { position:relative; width:${PAGE_WIDTH_MM}mm; margin:0 auto; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; background: #fff; }
table.sheet { border-collapse: collapse; table-layout: fixed; }
table.sheet thead { display: table-header-group; }
table.sheet tr { page-break-inside: avoid; }
</style>
</head><body>
${content}
<script>window.onload = function () { setTimeout(function () { window.print() }, 300) }</script>
</body></html>`
}

export interface PackingSheetOptions {
  site?: string
  companyName?: string
}

export async function generatePackingSheetPdf(lines: JobOrder[], options?: PackingSheetOptions) {
  if (!lines.length) return
  const sorted = [...lines].sort((a, b) => a.OrderDtl_OrderLine - b.OrderDtl_OrderLine)
  const now = new Date()
  const yearDigit = String(now.getFullYear()).slice(-1)
  const weekStr = String(getWeekNumber(now)).padStart(2, '0')

  let sizeRows = queryClient.getQueryData<Pick<Size, 'size_name' | 'size_code'>[]>(queryKeys.sizes.all)
  if (!sizeRows) sizeRows = await fetchSizeLookup()
  const sizeMap = new Map((sizeRows ?? []).map((s) => [s.size_name, String(s.size_code)]))

  const entries: Entry[] = []
  let prevCartons = 0

  for (const row of sorted) {
    const plantValue = row.JobHead_Plant
    const sizeName = extractSizeFromPartNum(row.OrderDtl_PartNum)
    const sizeCode = sizeMap.get(sizeName) ?? ''
    const parsed = parseLineDesc(row.OrderDtl_LineDesc || '')
    const qi = parseInt(parsed.qtyInner) || row.OrderDtl_FS_PcsPerBox_c || 0
    const qc = parseInt(parsed.qtyCarton) || row.OrderDtl_FS_BoxPerCarton_c || 0
    const threshold = qi * qc
    const pagesPerQty = threshold >= 1000 ? QTY_HIGH : QTY_STD
    const totalQty = row.OrderDtl_OrderQty || 0
    const totalPages = Math.max(1, Math.ceil(totalQty / pagesPerQty))

    let existingLot: Pick<PackingOrderTrans, 'cartonlot' | 'startpallet' | 'carton_number'> | null = null
    const cachedTrans = queryClient.getQueryData<PackingTransRow[]>(queryKeys.packingTrans.all)
    const cachedMatch = cachedTrans?.find((t) => t.job_num === row.JobHead_JobNum && t.part === row.OrderDtl_PartNum)
    if (cachedMatch) {
      existingLot = {
        cartonlot: cachedMatch.cartonlot,
        startpallet: cachedMatch.startpallet,
        carton_number: cachedMatch.carton_number,
      }
    } else {
      const rows = await fetchPackingTransByJob(row.JobHead_JobNum, row.OrderDtl_PartNum)
      existingLot = rows?.[0] ?? null
    }
    const cartonLot = existingLot?.cartonlot || `${plantValue}${yearDigit}${weekStr}${sizeCode}`
    const cartonPrefix = String(row.OrderHed_OrderNum).padStart(6, '0')
    const palletStartBase = existingLot?.startpallet || 1
    const storedStartMatch = existingLot?.carton_number?.trim().match(/\d+/)
    const storedStart = storedStartMatch ? parseInt(storedStartMatch[0], 10) : null

    const rowCartonStart = storedStart ?? prevCartons + 1
    const customer = row.OrderDtl_FS_LotNumber_c || '-'
    const pagesPerPallet = threshold >= 1000 ? 2 : 4
    let remainingQty = totalQty
    let runningCartonStart = rowCartonStart

    for (let p = 1; p <= totalPages; p++) {
      const pageQty = Math.min(remainingQty, pagesPerQty)
      remainingQty -= pageQty
      const pagePcs = pageQty * 1000
      const pageInners = qi ? pagePcs / qi : 0
      const pageCartons = qi && qc ? pagePcs / (qi * qc) : 0
      const cartonCount = Math.max(Math.round(pageCartons), 1)
      const cartonStartIndex = runningCartonStart
      const cartonEndIndex = runningCartonStart + cartonCount - 1
      runningCartonStart = cartonEndIndex + 1

      const palletIndex = Math.floor((p - 1) / pagesPerPallet)
      const palletNo = palletStartBase + palletIndex

      entries.push({
        partNum: row.OrderDtl_PartNum || '',
        size: sizeName,
        customer,
        qty: String(cartonCount),
        cartonNo: `${cartonPrefix} ${padNum(cartonStartIndex, 4)} - ${cartonPrefix} ${padNum(cartonEndIndex, 4)}`,
        ctn: String(Math.round(pageCartons)),
        inner: String(Math.round(pageInners)),
        lotInternal: `${cartonLot} ${padNum(palletNo, 5)}`,
        palletNo: padNum(palletNo, 5),
        brand: String(row.OrderDtl_FS_Brand_c || ''),
        packBy: String(row.Calculated_PlantPacking || ''),
      })
    }

    const cartons = threshold ? Math.floor((totalQty * 1000) / threshold) : 0
    prevCartons += cartons
  }

  const sizeMatrixOut = buildSizeMatrixRows(entries)
  const rawOut = buildRawRows(entries)

  // Load the active packing-sheet template (saved via Design Builder, else default)
  let template: TagElement[] | null = null
  let canvasWidth = 794
  try {
    const saved = await fetchPackingSheetTemplate()
    if (saved && Array.isArray(saved.elements) && saved.elements.length > 0) {
      template = saved.elements
      canvasWidth = saved.canvas_width || 794
    }
  } catch {
    template = null
  }
  if (!template) template = getDefaultSheetTemplate()

  const first = sorted[0]
  const tokens: Record<string, string> = {
    order: String(first.OrderHed_OrderNum).padStart(9, '0'),
    company: String(first.OrderHed_Company),
    totalPages: String(entries.length),
    date: formatDate(now),
    plant: String(first.JobHead_Plant || ''),
    jobNum: String(first.JobHead_JobNum || ''),
    partNum: String(first.OrderDtl_PartNum || ''),
    partGroup: extractBasePartGroup(first.OrderDtl_PartNum || ''),
    size: extractSizeFromPartNum(first.OrderDtl_PartNum || ''),
    brand: String(first.OrderDtl_FS_Brand_c || '-'),
    group: String(first.OrderDtl_FS_Brand_c || '-'),
    aql: String(first.OrderDtl_FS_AQLNew_c || '-'),
    containerSize: String(first.OrderDtl_FS_ContainerSize_c || '-'),
    needBy: first.OrderDtl_NeedByDate ? formatDate(new Date(first.OrderDtl_NeedByDate)) : '-',
    customerLot: String(first.OrderDtl_FS_LotNumber_c || '-'),
    customerLotVal: String(first.OrderDtl_FS_LotNumber_c || '-'),
    poNum: String(first.OrderHed_PONum || '-'),
    site: String(options?.site ?? ''),
    companyName: String(options?.companyName ?? ''),
  }

  const resolved = resolveTagElements(template, tokens)
  const tables = resolved
    .filter((el) => el.type === 'table')
    .sort((a, b) => a.y - b.y)
  const staticEls = resolved.filter((el) => el.type !== 'table')

  const pxToMm = pxToMmScale(canvasWidth, PAGE_WIDTH_MM)
  const mm = (v: number, min = 0): number => Math.max(min, Math.round(v * pxToMm * 100) / 100)

  const images: Record<string, string> = {}
  const qrTasks: Promise<void>[] = []
  for (const el of staticEls) {
    if (el.type === 'barcode' && el.barcodeContent) {
      const bc = generateBarcode(el.barcodeContent, Math.max(30, Math.round(el.height * 1.5)))
      if (bc) images[el.id] = bc
    }
    if (el.type === 'qrcode' && el.qrContent && el.qrContent.trim() !== '-') {
      qrTasks.push(
        QRCode.toDataURL(el.qrContent, { width: 300, margin: 1 })
          .then((url) => { images[el.id] = url })
          .catch(() => {}),
      )
    }
  }
  await Promise.all(qrTasks)

  const staticHtml = staticEls.map((el) => renderTagElementHtml(el, images, mm)).join('\n')
  const firstTableTop = tables.length > 0 ? tables[0].y : 92
  const headerHtml =
    `<div style="position:relative;width:${PAGE_WIDTH_MM}mm;height:${mm(firstTableTop)}mm;">${staticHtml}</div>`

  let tablesHtml = ''
  if (tables.length > 0) {
    let prevBottom = tables[0].y
    tables.forEach((t, i) => {
      const rows = isSizeGroupTable(t) ? sizeMatrixOut : rawOut
      const gap = i === 0 ? 0 : Math.max(0, t.y - prevBottom)
      tablesHtml += `<div style="position:relative;margin-top:${mm(gap)}mm;">${renderTable(t, rows, mm, tokens)}</div>`
      prevBottom = t.y + (t.height || 300)
    })
  } else {
    const defaultTable: TagElement = { id: 'tbl_default', type: 'table', x: 19, y: 92, width: 756, height: 500, rotation: 0, tableColumns: getDefaultSheetColumns() }
    tablesHtml = renderTable(defaultTable, rawOut, mm, tokens)
  }

  const html = fullHtml(headerHtml + '\n' + tablesHtml)

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
}

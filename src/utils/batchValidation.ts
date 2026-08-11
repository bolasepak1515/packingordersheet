import { getWeekNumber } from '@/utils/weekNumber'
import { parseLineDesc, extractSizeFromPartNum, padNum } from '@/utils/format'
import type { JobOrder } from '@/types'

export type BatchLineStatus = 'pending' | 'creating' | 'completed' | 'failed' | 'skipped'

export interface LinePreviewData {
  jobNum: string
  partNum: string
  orderNum: number
  orderLine: number
  company: string
  lotId: string
  internalLot: string
  startPallet: number
  endPallet: number
  pages: number
  pcsPerBox: number
  boxPerCarton: number
  totalCtn: number
  orderQty: number
  cartonStart: number
  cartonEnd: number
  cartonNumber: string
}

export interface BatchValidationResult {
  valid: boolean
  status: 'pending' | 'skipped'
  reason: string
}

export interface ValidateLineOptions {
  cartonLots: Record<string, string>
  userRole?: string
  userSite?: string
  plantFilter?: string
}

export function isMfgsysLine(row: JobOrder): boolean {
  const plant = (row.JobHead_Plant ?? '').toUpperCase()
  const packing = (row.Calculated_PlantPacking ?? '').toUpperCase()
  return plant === 'MFGSYS' || packing === 'MFGSYS'
}

export function isPackingSheetReady(row: JobOrder, cartonLots: Record<string, string>): boolean {
  if (!row.JobHead_JobNum) return false
  if (isMfgsysLine(row)) return false
  const key = `${row.JobHead_JobNum}|${row.OrderDtl_PartNum}`
  if (!cartonLots[key]) return false
  const parsed = parseLineDesc(row.OrderDtl_LineDesc || '')
  const qtyInner = parseInt(parsed.qtyInner) || row.OrderDtl_FS_PcsPerBox_c || 0
  const qtyCarton = parseInt(parsed.qtyCarton) || row.OrderDtl_FS_BoxPerCarton_c || 0
  return qtyInner > 0 && qtyCarton > 0
}

export function validateJobOrderLine(row: JobOrder, opts: ValidateLineOptions): BatchValidationResult {
  const key = `${row.JobHead_JobNum}|${row.OrderDtl_PartNum}`

  if (!row.JobHead_JobNum) {
    return { valid: false, status: 'skipped', reason: 'No Job Number' }
  }

  if (opts.userRole !== 'admin') {
    if (opts.userSite && row.JobHead_Plant !== opts.userSite) {
      return { valid: false, status: 'skipped', reason: `Site Restricted (${opts.userSite})` }
    }
  } else if (opts.plantFilter && row.JobHead_Plant !== opts.plantFilter) {
    return { valid: false, status: 'skipped', reason: `Filtered to ${opts.plantFilter}` }
  }

  if (isMfgsysLine(row)) {
    return { valid: false, status: 'skipped', reason: 'MFGSYS Site (excluded)' }
  }

  if (opts.cartonLots[key]) {
    return { valid: false, status: 'skipped', reason: 'Already Created' }
  }

  const parsed = parseLineDesc(row.OrderDtl_LineDesc || '')
  const qtyInner = parseInt(parsed.qtyInner) || row.OrderDtl_FS_PcsPerBox_c || 0
  const qtyCarton = parseInt(parsed.qtyCarton) || row.OrderDtl_FS_BoxPerCarton_c || 0
  if (!qtyInner || !qtyCarton) {
    return { valid: false, status: 'skipped', reason: 'Missing PCS/Inner or Inner/CTN values' }
  }

  return { valid: true, status: 'pending', reason: '' }
}

export interface CalculateLinePreviewOptions {
  runningPallet: number
  plantMap: Record<string, string>
  sizeMap: Record<string, string>
  allRows: JobOrder[]
}

export function calculateLinePreviewData(row: JobOrder, opts: CalculateLinePreviewOptions): LinePreviewData {
  const { runningPallet, plantMap, sizeMap, allRows } = opts

  const plantValue = plantMap[row.JobHead_Plant] ?? row.JobHead_Plant
  const now = new Date()
  const yearDigit = String(now.getFullYear()).slice(-1)
  const weekStr = String(getWeekNumber(now)).padStart(2, '0')
  const sizeName = extractSizeFromPartNum(row.OrderDtl_PartNum)
  const sizeCode = sizeMap[sizeName] ?? ''
  const lotId = `${plantValue}${yearDigit}${weekStr}${sizeCode}`

  const startPallet = runningPallet + 1
  const parsed = parseLineDesc(row.OrderDtl_LineDesc || '')
  const qtyInner = parseInt(parsed.qtyInner) || row.OrderDtl_FS_PcsPerBox_c || 0
  const qtyCarton = parseInt(parsed.qtyCarton) || row.OrderDtl_FS_BoxPerCarton_c || 0
  const threshold = qtyInner * qtyCarton
  const pages = threshold >= 1000
    ? Math.ceil((row.OrderDtl_OrderQty || 0) / 50)
    : Math.ceil((row.OrderDtl_OrderQty || 0) / 25)
  const pallets = Math.ceil(pages / (threshold >= 1000 ? 2 : 4))
  const endPallet = startPallet + pallets - 1

  let cartonStart = 0
  let cartonEnd = 0
  if (qtyInner && qtyCarton) {
    const cartons = Math.floor(((row.OrderDtl_OrderQty || 0) * 1000) / (qtyInner * qtyCarton))
    let prev = 0
    for (const r of allRows) {
      if (r.OrderHed_Company !== row.OrderHed_Company || r.OrderHed_OrderNum !== row.OrderHed_OrderNum) continue
      if (r.OrderDtl_OrderLine >= row.OrderDtl_OrderLine) break
      const p = parseLineDesc(r.OrderDtl_LineDesc || '')
      const qi = parseInt(p.qtyInner) || r.OrderDtl_FS_PcsPerBox_c || 0
      const qc = parseInt(p.qtyCarton) || r.OrderDtl_FS_BoxPerCarton_c || 0
      if (qi && qc) prev += Math.floor(((r.OrderDtl_OrderQty || 0) * 1000) / (qi * qc))
    }
    cartonStart = prev + 1
    cartonEnd = prev + cartons
  }

  return {
    jobNum: row.JobHead_JobNum,
    partNum: row.OrderDtl_PartNum,
    orderNum: row.OrderHed_OrderNum,
    orderLine: row.OrderDtl_OrderLine,
    company: row.OrderHed_Company,
    lotId,
    internalLot: row.OrderDtl_FS_LotNumber_c ?? '',
    startPallet,
    endPallet,
    pages,
    pcsPerBox: qtyInner,
    boxPerCarton: qtyCarton,
    totalCtn: row.Calculated_Total_CTN ?? 0,
    orderQty: row.OrderDtl_OrderQty ?? 0,
    cartonStart,
    cartonEnd,
    cartonNumber: cartonEnd > 0 ? `${padNum(cartonStart, 5)} - ${padNum(cartonEnd, 5)}` : '',
  }
}

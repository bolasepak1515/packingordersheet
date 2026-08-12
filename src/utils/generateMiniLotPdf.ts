import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { fetchTagTemplate, fetchSizeLookup, fetchPackingTransByJob, type TagTemplateRow } from '@/lib/db'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/hooks/queryKeys'
import type { PackingTransRow } from '@/hooks/useMasterData'
import { getDefaultTemplate } from '@/components/tagbuilder/defaultTemplate'
import { renderTagTemplateHtml, resolveTagElements } from '@/utils/renderTagTemplateHtml'
import { getWeekNumber } from '@/utils/weekNumber'
import { formatDate, extractSizeFromPartNum, extractBasePartGroup, padNum, parseLineDesc } from '@/utils/format'
import type { JobOrder, PackingOrderTrans, Size } from '@/types'
import type { TagElement } from '@/components/tagbuilder/types'

const QTY_STD = 25
const QTY_HIGH = 50

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

function fullHtml(pages: string[]) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Packing Order Lot</title>
<style>
@page { margin: 0; size: 80mm auto; }
@media print { html,body { margin:0;padding:0; } .tag { page-break-after:always; } .tag:last-child { page-break-after:avoid; } }
* { margin:0;padding:0;box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { width:80mm; font-family:Arial,Helvetica,sans-serif; color:#000; background:#fff; }
</style></head><body>
${pages.join('\n')}
<script>window.onload = function () { setTimeout(function () { window.print() }, 300) }</script>
</body></html>`
}

export interface MiniLotPdfOptions {
  site?: string
  companyName?: string
  /** Plant -> calculated packing material list (from the MTL lookup). */
  packagingMaterials?: Record<string, string>
}

export async function generateMiniLotPdf(row: JobOrder, allData: JobOrder[], options?: MiniLotPdfOptions) {
  const now = new Date()
  const yearDigit = String(now.getFullYear()).slice(-1)
  const weekStr = String(getWeekNumber(now)).padStart(2, '0')

  // Load the active template (saved via Tag Builder, else default)
  let template: TagElement[] | null = null
  let canvasWidth = 300
  try {
    const cached = queryClient.getQueryData<TagTemplateRow | null>(queryKeys.templates.tag)
    const saved = cached !== undefined ? cached : await fetchTagTemplate()
    if (saved && Array.isArray(saved.elements) && saved.elements.length > 0) {
      template = saved.elements
      canvasWidth = saved.canvas_width || 300
    }
  } catch {
    template = null
  }
  if (!template) template = getDefaultTemplate()

  // QRs gated on {lotQty}: only render on pages that actually carry a lot quantity
  const lotQtyQrTokens = ['{jobInfo}', '{cartonRange}', '{customerLotVal}', '{intLot}', '{lotNo}']
  const lotQtyGatedQrIds = new Set(
    template
      .filter((el) => el.type === 'qrcode' && lotQtyQrTokens.includes(el.qrContent ?? ''))
      .map((el) => el.id),
  )

  // Time Entry note only renders on pages that carry a lot quantity
  const timeEntryNoteIds = new Set(
    template
      .filter((el) => el.type === 'text' && (el.text ?? '').includes('Time Entry'))
      .map((el) => el.id),
  )

  let sizeRows = queryClient.getQueryData<Pick<Size, 'size_name' | 'size_code'>[]>(queryKeys.sizes.all)
  if (!sizeRows) sizeRows = await fetchSizeLookup()
  const sizeMap = new Map((sizeRows ?? []).map((s) => [s.size_name, String(s.size_code)]))

  const plantValue = row.JobHead_Plant
  const sizeName = extractSizeFromPartNum(row.OrderDtl_PartNum)
  const sizeCode = sizeMap.get(sizeName) ?? ''

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
  const palletStartBase = existingLot?.startpallet || 1
  const storedStartMatch = existingLot?.carton_number?.trim().match(/\d+/)
  const storedStart = storedStartMatch ? parseInt(storedStartMatch[0], 10) : null

  const lotNoForRow =
    String(row.OrderHed_OrderNum).padStart(9, '0') + '-' +
    String(row.OrderDtl_OrderLine).padStart(2, '0')

  const parsed = parseLineDesc(row.OrderDtl_LineDesc || '')
  const qtyInner = parseInt(parsed.qtyInner) || 0
  const qtyCarton = parseInt(parsed.qtyCarton) || 0

  let prevCartons = 0
  for (const r of allData) {
    if (r.OrderHed_OrderNum !== row.OrderHed_OrderNum) continue
    if (r.OrderDtl_OrderLine >= row.OrderDtl_OrderLine) break
    const p = parseLineDesc(r.OrderDtl_LineDesc || '')
    const qi = parseInt(p.qtyInner) || 0
    const qc = parseInt(p.qtyCarton) || 0
    if (qi && qc) prevCartons += Math.floor(((r.OrderDtl_OrderQty || 0) * 1000) / (qi * qc))
  }

  const rowCartonStart = storedStart ?? prevCartons + 1
  const totalQty = row.OrderDtl_OrderQty || 0
  const threshold = qtyInner * qtyCarton
  const pagesPerQty = threshold >= 1000 ? QTY_HIGH : QTY_STD
  const totalPages = Math.max(1, Math.ceil(totalQty / pagesPerQty))
  const dateStr = formatDate(now)
  const jobNum = row.JobHead_JobNum
  const partNum = row.OrderDtl_PartNum
  const customer = row.OrderDtl_FS_LotNumber_c || ''
  const aql = row.OrderDtl_FS_AQLNew_c || ''
  const brand = row.OrderDtl_FS_Brand_c || ''
  const containerSize = row.OrderDtl_FS_ContainerSize_c || ''
  const needByRaw = row.OrderDtl_NeedByDate || ''
  const needBy = needByRaw
    ? (() => { const d = new Date(needByRaw); return isNaN(d.getTime()) ? needByRaw.slice(0, 10) : formatDate(d) })()
    : ''

  let remainingQty = totalQty

  const pageData: {
    p: number; pageQty: number; pageInners: number; pageCartons: number
    cartonRangeStr: string; internalLot: string; qrContent: string; lotQty: number | null
  }[] = []

  let lotAccum = 0
  let runningCartonStart = rowCartonStart

  for (let p = 1; p <= totalPages; p++) {
    const pagesPerPallet = threshold >= 1000 ? 2 : 4
    const palletIndex = Math.floor((p - 1) / pagesPerPallet)
    const internalLot = `${cartonLot} ${padNum(palletStartBase + palletIndex, 5)}`

    const pageQty = Math.min(remainingQty, pagesPerQty)
    remainingQty -= pageQty
    const pagePcs = pageQty * 1000
    const pageInners = qtyInner ? pagePcs / qtyInner : 0
    const pageCartons = qtyInner && qtyCarton ? pagePcs / (qtyInner * qtyCarton) : 0

    const cartonCount = Math.max(Math.round(pageCartons), 1)
    const cartonStartIndex = runningCartonStart
    const cartonEndIndex = runningCartonStart + cartonCount - 1
    runningCartonStart = cartonEndIndex + 1
    const cartonRangeStr = `${padNum(cartonStartIndex, 4)}-${padNum(cartonEndIndex, 4)}`

    lotAccum += pageQty
    const lotQty = (p % 2 === 0 || p === totalPages) ? lotAccum : null
    if (lotQty !== null) lotAccum = 0

    // jobInfo QR always shows, even when a component (e.g. customer lot) is empty
    const qrContent = [jobNum, lotQty ?? 0, customer, lotNoForRow, cartonRangeStr, internalLot, p].join(',')

    pageData.push({
      p, pageQty, pageInners, pageCartons, cartonRangeStr, internalLot,
      qrContent,
      lotQty,
    })
  }

  const pagesHtml: string[] = []
  for (const pd of pageData) {
    const tokens: Record<string, string> = {
      plant: plantValue,
      packagingMaterial: options?.packagingMaterials?.[plantValue] ?? '-',
      date: dateStr,
      p: String(pd.p),
      total: String(totalPages),
      size: sizeName,
      jobNum,
      partNum,
      partGroup: extractBasePartGroup(partNum),
      aql: aql || '-',
      brand: brand || '-',
      group: brand || '-',
      containerSize: containerSize || '-',
      needBy: needBy || '-',
      pageCartons: String(pd.pageCartons),
      pageQty: String(pd.pageQty),
      lotQty: pd.lotQty !== null ? String(pd.lotQty) : '',
      lotNo: lotNoForRow,
      cartonRange: pd.cartonRangeStr,
      customerLot: customer || '-',
      customerLotVal: customer || '-',
      intLot: pd.internalLot,
      jobInfo: pd.qrContent,
      site: String(options?.site ?? ''),
      companyName: String(options?.companyName ?? ''),
    }

    const resolved = resolveTagElements(template, tokens).filter(
      (el) => !(pd.lotQty === null && timeEntryNoteIds.has(el.id)),
    )

    const images: Record<string, string> = {}
    const qrTasks: Promise<void>[] = []
    for (const el of resolved) {
      if (el.type === 'barcode' && el.barcodeContent) {
        const bc = generateBarcode(el.barcodeContent, Math.max(30, Math.round(el.height * 1.5)))
        if (bc) images[el.id] = bc
      }
      if (el.type === 'qrcode') {
        const content = (el.qrContent ?? '').trim()
        const gatedByLotQty = pd.lotQty === null && lotQtyGatedQrIds.has(el.id)
        if (!gatedByLotQty && content && content !== '-') {
          qrTasks.push(
            QRCode.toDataURL(content, { width: 300, margin: 1 })
              .then((url) => { images[el.id] = url })
              .catch(() => {}),
          )
        }
      }
    }
    await Promise.all(qrTasks)

    pagesHtml.push(renderTagTemplateHtml(resolved, images, canvasWidth))
  }

  const doc = fullHtml(pagesHtml)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(doc)
  w.document.close()
  w.focus()
}

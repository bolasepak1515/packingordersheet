import type { TagElement, PackingSheetColumn } from './types'
import { extractSizeFromPartNum, extractBasePartGroup } from '@/utils/format'

const SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL']

/** Mirrors isSizeGroupTable in generatePackingSheetPdf (kept local to avoid a
 *  static import defeating that module's lazy chunk). */
function isSizeMatrix(columns: PackingSheetColumn[]): boolean {
  const labels = columns.map((c) => (c.label ?? '').trim().toUpperCase())
  const hasPart = labels.includes('PART')
  const hasSize = labels.some((l) => ['XS', 'S', 'M', 'L', 'XL'].includes(l))
  const hasTotalCtn = labels.some((l) => l.startsWith('TOTAL') && l.includes('CTN'))
  return hasPart && (hasSize || hasTotalCtn)
}

/*
┌──────────────────────────────┬──────────────────────────────────────────────┬──────────────────────────┐
│ Token                        │ Data Source / Derivation                     │ DB Column / Table        │
├──────────────────────────────┼──────────────────────────────────────────────┼──────────────────────────┤
│ {size}                       │ 2nd-to-last segment of PartNum (e.g. "M")    │ Epicor OrderDtl_PartNum  │
│ {plant}                      │ Plant code from job                          │ Epicor JobHead_Plant     │
│ {packagingMaterial}          │ Packing material list for the plant          │ Epicor Naz_PackingOrderSheetMTL.Calculated_List_Material │
│ {date}                       │ Today's date (DD/MM/YYYY)                    │ new Date()               │
│ {p}                          │ Current page number (1-based)                │ Computed                 │
│ {total}                      │ Total pages for this row                     │ Computed                 │
│ {jobNum}                     │ Job order number                             │ Epicor JobHead_JobNum    │
│ {partNum}                    │ Part number                                  │ Epicor OrderDtl_PartNum  │
│ {partGroup}                  │ Part number minus size + seq (e.g.            │ Epicor OrderDtl_PartNum  │
│                              │     INDWE-ITA-3.2PFTN-FTIB)                   │                          │
│ {aql}                        │ AQL value (defaults to "-" if empty)         │ Epicor OrderDtl_FS_AQLNew_c │
│ {brand}                      │ Brand name                                   │ Epicor OrderDtl_FS_Brand_c │
│ {group}                      │ Brand group (same source as {brand})         │ Epicor OrderDtl_FS_Brand_c │
│ {containerSize}              │ Container size (defaults to "-")             │ Epicor OrderDtl_FS_ContainerSize_c │
│ {needBy}                     │ Need-by date (DD/MM/YYYY)                    │ Epicor OrderDtl_NeedByDate │
│ {pageCartons}                │ Cartons on this page (pageQty*1000 / inner)  │ Computed from OrderDtl_LineDesc │
│ {pageQty}                    │ Qty on this page (min of remaining, perPage) │ Computed from OrderDtl_OrderQty │
│ {lotQty}                     │ Accumulated qty across pages (every 2 pgs)   │ Computed                 │
│ {lotNo}                      │ OrderNum(9-digit) + OrderLine(2-digit)       │ Epicor OrderHed_OrderNum + OrderDtl_OrderLine │
│ {cartonRange}                │ "startCtn-endCtn" (cumulative across rows)   │ Computed                 │
│ {customerLot}                │ Customer lot number (barcode content)        │ Epicor OrderDtl_FS_LotNumber_c │
│ {customerLotVal}             │ Same value, displayed as text below barcode  │ Epicor OrderDtl_FS_LotNumber_c │
│ {intLot}                     │ cartonLot + palletIndex (e.g. K6301 00103)   │ packingordertrans.cartonlot + Computed │
│ {jobInfo}                    │ QR: jobNum,lotQty,custLot,lotNo,carton,      │ Composite (7 fields)     │
│                              │     intLot,p                                 │                          │
└──────────────────────────────┴──────────────────────────────────────────────┴──────────────────────────┘
  Epicor = OData API from ERP system
  Computed = derived at runtime by generateMiniLotPdf.ts
*/

export const SAMPLE = {
  plant: '43816C',
  packagingMaterial: 'CORRUGATED BOX 32MM, STRETCH FILM 200MM',
  date: '29/07/2026',
  p: '2',
  total: '3',
  size: 'S',
  jobNum: 'P0000000002-01',
  partNum: 'INDWE-ITA-3.2PFTN-FTIB-S-01',
  partGroup: 'INDWE-ITA-3.2PFTN-FTIB',
  aql: '-',
  brand: 'NITRO-TOUCH NPF35',
  group: 'NITRO-TOUCH NPF35',
  pageCartons: '50',
  pageQty: '50',
  lotNo: '000000002-01',
  cartonRange: '00051-00100',
  customerLot: '-',
  customerLotVal: '-',
  intLot: 'K6301 000103',
  containerSize: '-',
  needBy: '26/05/2026',
  lotQty: '100',
  jobInfo: 'P0000000002-01,100,-,000000002-01,00051-00100,K6301 000103,2',
  order: '000000002',
  company: 'NITRO-TOUCH SDN BHD',
  companyName: 'NITRO-TOUCH SDN BHD',
  site: '6062A',
  totalPages: '3',
}

type TokenMap = Record<string, string>

function fill(text: string, tokens: TokenMap): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => tokens[key] ?? `{${key}}`)
}

const TEXT_FIELDS: (keyof TagElement)[] = [
  'text', 'qrContent', 'barcodeContent', 'imgSrc',
]

export function resolvePreviewElements(elements: TagElement[], overrides?: Partial<TokenMap>): TagElement[] {
  const tokens: TokenMap = {}
  for (const [k, v] of Object.entries(SAMPLE)) tokens[k] = String(v)
  // Real login values take precedence over the hardcoded samples so the preview
  // matches what the PDF will print for the current user.
  if (overrides?.site) tokens.site = overrides.site
  if (overrides?.companyName) tokens.companyName = overrides.companyName
  // Derive {size} from the part number exactly like the PDF generator, so the
  // preview always matches the printed tag (segment only; page is added by {p}).
  tokens.size = extractSizeFromPartNum(SAMPLE.partNum) || SAMPLE.size
  tokens.partGroup = extractBasePartGroup(SAMPLE.partNum)

  return elements.map((el) => {
    const copy = { ...el }
    for (const field of TEXT_FIELDS) {
      const val = copy[field]
      if (typeof val === 'string') {
        (copy as Record<string, unknown>)[field] = fill(val, tokens)
      }
    }
    return copy
  })
}

/** Sample values for the packing-sheet table body rows (preview only). */
export const SHEET_SAMPLE: Record<string, string> = {
  seq: 'M1',
  pallet: '00001',
  lotInternal: 'K6301 00001',
  lotCustomer: '-',
  size: 'M',
  qty: '25',
  cartonNo: 'K6301 0001 - K6301 0025',
  ctn: '25',
  inner: '100',
}

/** Builds preview body rows for a table element from its dataKey mappings. */
export function sheetSampleRows(columns: PackingSheetColumn[]): string[][] {
  if (isSizeMatrix(columns)) {
    return matrixSampleRows(columns)
  }
  const rows: string[][] = []
  for (let i = 0; i < 5; i++) {
    rows.push(
      columns.map((c) => {
        if (!c.dataKey) return ''
        const base = SHEET_SAMPLE[c.dataKey] ?? SAMPLE[c.dataKey as keyof typeof SAMPLE] ?? ''
        if (c.dataKey === 'seq') return `M${i + 1}`
        if (c.dataKey === 'pallet') return String(i + 1).padStart(5, '0')
        if (c.dataKey === 'cartonNo') return `K6301 ${String(i * 25 + 1).padStart(4, '0')} - K6301 ${String(i * 25 + 25).padStart(4, '0')}`
        return base
      }),
    )
  }
  return rows
}

/** Sample rows for the size-matrix table (Part | Brand | XS..XL | Total | Pack By). */
const MATRIX_SAMPLE_ROWS: { partGroup: string; brand: string; sizes: Record<string, string>; total: string; packBy: string }[] = [
  { partGroup: 'INDWE-ITA-3.2PFTN-FTIB', brand: 'NITRO-TOUCH NPF35', sizes: { XS: '0', S: '0', M: '50', L: '50', XL: '0' }, total: '100', packBy: 'MFGSYS' },
  { partGroup: 'NURTE-TUR-2.2PFSN-FTCB', brand: 'NITRO-TOUCH NPF35', sizes: { XS: '10', S: '20', M: '30', L: '0', XL: '0' }, total: '60', packBy: 'MFGSYS' },
]

function matrixSampleRows(columns: PackingSheetColumn[]): string[][] {
  const rows = MATRIX_SAMPLE_ROWS.map((r) =>
    columns.map((c) => {
      const label = (c.label ?? '').trim().toUpperCase()
      if (label === 'PART') return r.partGroup
      if (label === 'BRAND') return r.brand
      if (label.startsWith('TOTAL')) return r.total
      if (label === 'PACK BY') return r.packBy
      if ((SIZE_LABELS as readonly string[]).includes(label)) return r.sizes[label] ?? '0'
      return ''
    }),
  )
  const grandTotal = MATRIX_SAMPLE_ROWS.reduce((s, r) => s + (parseInt(r.total) || 0), 0)
  rows.push(
    columns.map((c) => {
      const label = (c.label ?? '').trim().toUpperCase()
      if (label === 'PART') return 'Total'
      if (label.startsWith('TOTAL')) return String(grandTotal)
      return ''
    }),
  )
  return rows
}

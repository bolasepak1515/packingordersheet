export type ElementType = 'text' | 'qrcode' | 'barcode' | 'image' | 'line' | 'box' | 'table'

export interface PackingSheetColumn {
  id: string
  label: string
  sublabel?: string
  width: number
  dataKey?: string
  align?: 'left' | 'center' | 'right'
}

export interface TagElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  backgroundColor?: string
  opacity?: number
  borderWidth?: number
  borderColor?: string
  borderRadius?: number
  qrContent?: string
  barcodeContent?: string
  barcodeFormat?: 'CODE128' | 'EAN13' | 'UPC'
  imgSrc?: string
  lineOrientation?: 'horizontal' | 'vertical'
  lineThickness?: number
  lineColor?: string
  tableColumns?: PackingSheetColumn[]
  tableRowHeight?: number
  tableHeaderFontSize?: number
  tableBodyFontSize?: number
  tableHeaderBg?: string
}

export type CanvasSize = '4x6' | '3x5' | 'A4'

export const TOKENS = [
  { token: '{jobNum}', label: 'Job Number' },
  { token: '{partNum}', label: 'Part Number' },
  { token: '{partGroup}', label: 'Part Number (Group)' },
  { token: '{aql}', label: 'AQL' },
  { token: '{brand}', label: 'Brand' },
  { token: '{group}', label: 'Brand Group' },
  { token: '{containerSize}', label: 'Container Size' },
  { token: '{needBy}', label: 'Need By Date' },
  { token: '{size}', label: 'Size Code' },
  { token: '{plant}', label: 'Plant Code' },
  { token: '{date}', label: 'Print Date' },
  { token: '{p}', label: 'Page Number' },
  { token: '{total}', label: 'Total Pages' },
  { token: '{pageCartons}', label: 'Cartons/Page' },
  { token: '{pageQty}', label: 'Qty/Page (KPCS)' },
  { token: '{lotQty}', label: 'Qty/Lot (KPCS)' },
  { token: '{lotNo}', label: 'Lot Number' },
  { token: '{cartonRange}', label: 'Carton Range' },
  { token: '{customerLot}', label: 'Customer Lot' },
  { token: '{customerLotVal}', label: 'Customer Lot (text)' },
  { token: '{intLot}', label: 'Internal Lot' },
  { token: '{jobInfo}', label: 'Job Info (QR)' },
  { token: '{order}', label: 'Order Number' },
  { token: '{company}', label: 'Company' },
  { token: '{companyName}', label: 'Company Name (Login)' },
  { token: '{site}', label: 'Site (Login)' },
  { token: '{totalPages}', label: 'Total Pages' },
]

/** Data columns available for the packing-sheet table element body rows. */
export const SHEET_DATA_COLUMNS = [
  { key: 'seq', label: 'Sequence' },
  { key: 'pallet', label: 'Pallet No' },
  { key: 'lotInternal', label: 'Lot Internal' },
  { key: 'lotCustomer', label: 'Lot Customer' },
  { key: 'size', label: 'Size' },
  { key: 'qty', label: 'Qty' },
  { key: 'cartonNo', label: 'Carton No' },
  { key: 'ctn', label: 'CTN' },
  { key: 'inner', label: 'Inner' },
]

import type { TagElement, ElementType, PackingSheetColumn } from './types'

const DEFAULTS: Record<ElementType, Partial<TagElement>> = {
  text: { x: 40, y: 40, width: 200, height: 30, rotation: 0, text: 'Text', fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left', color: '#000000', backgroundColor: 'transparent', opacity: 1 },
  qrcode: { x: 40, y: 40, width: 100, height: 100, rotation: 0, qrContent: 'https://example.com', opacity: 1 },
  barcode: { x: 40, y: 40, width: 200, height: 60, rotation: 0, barcodeContent: '1234567890', barcodeFormat: 'CODE128', opacity: 1 },
  image: { x: 40, y: 40, width: 80, height: 80, rotation: 0, imgSrc: '', opacity: 1 },
  line: { x: 40, y: 40, width: 300, height: 2, rotation: 0, lineOrientation: 'horizontal', lineThickness: 2, lineColor: '#000000', opacity: 1 },
  box: { x: 40, y: 40, width: 200, height: 100, rotation: 0, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#999', borderRadius: 4, opacity: 1 },
  table: { x: 40, y: 40, width: 240, height: 150, rotation: 0, tableRowHeight: 40, tableHeaderFontSize: 12, tableBodyFontSize: 13, tableHeaderBg: '#f5f5f5', opacity: 1 },
}

const NUMERIC: (keyof TagElement)[] = ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'fontSize', 'borderWidth', 'borderRadius', 'lineThickness', 'tableRowHeight', 'tableHeaderFontSize', 'tableBodyFontSize']

let _seed = 0
function nextId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${++_seed}`
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && isFinite(v) ? v : fallback
}

const HEX3 = /^#([0-9a-fA-F]{3})$/
const HEX6 = /^#([0-9a-fA-F]{6})$/

/**
 * Normalizes any color value to a valid 6-digit hex string accepted by
 * <input type="color">. Values like "transparent", "red", or "#999" are
 * converted to the fallback / expanded form so the native picker never
 * throws "specified value does not conform to the required format".
 */
export function toHexColor(v: unknown, fallback = '#000000'): string {
  if (typeof v === 'string') {
    const s = v.trim()
    const m6 = HEX6.exec(s)
    if (m6) return '#' + m6[1]
    const m3 = HEX3.exec(s)
    if (m3) return '#' + m3[1].split('').map((c) => c + c).join('')
  }
  return fallback
}

function sanitizeTableColumns(raw: unknown): PackingSheetColumn[] {
  const fallbackCol = (): PackingSheetColumn => ({ id: nextId('c'), label: 'Column', sublabel: '', width: 80, dataKey: '', align: 'center' })
  if (!Array.isArray(raw) || raw.length === 0) {
    return [fallbackCol(), fallbackCol(), fallbackCol()]
  }
  return raw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({
      id: typeof c.id === 'string' && c.id ? c.id : nextId('c'),
      label: typeof c.label === 'string' && c.label !== '' ? c.label : 'Column',
      sublabel: typeof c.sublabel === 'string' ? c.sublabel : '',
      width: num(c.width, 80),
      dataKey: typeof c.dataKey === 'string' ? c.dataKey : '',
      align: (c.align === 'left' || c.align === 'center' || c.align === 'right') ? c.align : 'center',
    }))
}

/**
 * Ensures a loaded template element has every field its type needs, filling
 * sensible defaults for anything missing or invalid (e.g. rows inserted
 * directly into the DB with only id/type/text). Prevents NaN geometry.
 * Returns null for unknown types / non-objects (they get dropped in the array
 * version so they can't break the canvas).
 */
export function sanitizeTemplateElement(raw: unknown): TagElement | null {
  if (!raw || typeof raw !== 'object') return null
  const src = raw as Record<string, unknown>
  const type = src.type as ElementType
  const d = DEFAULTS[type]
  if (!d) return null

  const el = { id: typeof src.id === 'string' && src.id ? src.id : nextId('el'), type } as TagElement
  const out = el as unknown as Record<string, unknown>

  for (const [key, fallback] of Object.entries(d)) {
    const rawVal = src[key]
    if (NUMERIC.includes(key as keyof TagElement)) {
      out[key] = num(rawVal, fallback as number)
    } else if (rawVal === undefined || typeof rawVal !== typeof fallback) {
      out[key] = fallback
    } else {
      out[key] = rawVal
    }
  }

  if (type === 'table' && Array.isArray(src.tableColumns)) {
    el.tableColumns = sanitizeTableColumns(src.tableColumns)
  }

  return el
}

export function sanitizeTemplateElements(raw: unknown): TagElement[] {
  if (!Array.isArray(raw)) return []
  return raw.map(sanitizeTemplateElement).filter((e): e is TagElement => e !== null)
}
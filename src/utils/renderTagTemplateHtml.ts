import type { TagElement, PackingSheetColumn } from '@/components/tagbuilder/types'

export function pxToMmScale(canvasWidth: number, pageWidthMm: number): number {
  return pageWidthMm / canvasWidth
}

/**
 * Renders a TagElement[] canvas into a print-ready HTML fragment.
 * Canvas coordinates are px; the target page width in mm defaults to 80mm
 * (label assumption). Pass pageWidthMm: 210 for an A4 sheet.
 * Barcodes / QR codes must be passed in as data URLs keyed by element id.
 */
export function renderTagTemplateHtml(
  elements: TagElement[],
  images: Record<string, string>,
  canvasWidth: number,
  pageWidthMm = 80,
): string {
  const pxToMm = pxToMmScale(canvasWidth, pageWidthMm)

  function mm(v: number, min = 0): number {
    return Math.max(min, Math.round(v * pxToMm * 100) / 100)
  }

  const parts = elements.map((el) => renderTagElementHtml(el, images, mm))

  const tagHeight = elements.length > 0
    ? Math.max(...elements.map((e) => e.y + e.height))
    : 5

  return `<div class="tag" style="position:relative;width:${pageWidthMm}mm;height:${mm(tagHeight)}mm;overflow:hidden;background:#fff;">${parts.join('\n')}</div>`
}

/** Renders a single element as an absolutely positioned div (px -> mm). */
export function renderTagElementHtml(
  el: TagElement,
  images: Record<string, string>,
  mm: (v: number, min?: number) => number,
): string {
  const base: Record<string, string> = {
    position: 'absolute',
    left: `${mm(el.x)}mm`,
    top: `${mm(el.y)}mm`,
    width: `${mm(el.width)}mm`,
    height: `${mm(el.height)}mm`,
    opacity: String(el.opacity ?? 1),
    overflow: 'hidden',
    'box-sizing': 'border-box',
  }
  if (el.rotation) base.transform = `rotate(${el.rotation}deg)`

  let inner = ''

  switch (el.type) {
    case 'text': {
      const fs = `${mm(el.fontSize ?? 12, 2)}mm`
      const bold = (el.fontWeight ?? 'normal') === 'bold' ? 'bold' : 'normal'
      const italic = (el.fontStyle ?? 'normal') === 'italic' ? 'italic' : 'normal'
      const txt = (el.text ?? '')
        .split('\n')
        .map((line) => escapeHtml(line))
        .join('<br>')
      inner =
        `<div style="width:100%;height:100%;font-size:${fs};font-family:${el.fontFamily ?? 'Arial'};` +
        `font-weight:${bold};font-style:${italic};text-align:${el.textAlign ?? 'left'};` +
        `color:${el.color ?? '#000'};background:${el.backgroundColor ?? 'transparent'};` +
        `border:${el.borderWidth ? `${mm(el.borderWidth, 0)}mm solid ${el.borderColor ?? '#000'}` : 'none'};` +
        `border-radius:${mm(el.borderRadius ?? 0)}mm;line-height:1.2;` +
        `padding:1px 2px;box-sizing:border-box;` +
        `word-break:break-word;">${txt}</div>`
      break
    }
    case 'barcode': {
      const src = images[el.id]
      inner = src
        ? `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:contain;background:#fff;">`
        : `<div style="width:100%;height:100%;background:#fff;"></div>`
      break
    }
    case 'qrcode': {
      const src = images[el.id]
      inner = src
        ? `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:contain;background:#fff;">`
        : `<div style="width:100%;height:100%;background:#fff;"></div>`
      break
    }
    case 'image': {
      inner = el.imgSrc
        ? `<img src="${el.imgSrc}" alt="" style="width:100%;height:100%;object-fit:contain;">`
        : ''
      break
    }
    case 'line': {
      if (el.lineOrientation === 'vertical') {
        inner =
          `<div style="width:0;height:100%;margin:0 auto;` +
          `border-left:${mm(el.lineThickness ?? 1, 0)}mm solid ${el.lineColor ?? '#000'};"></div>`
      } else {
        inner =
          `<div style="width:100%;height:0;margin:auto 0;` +
          `border-top:${mm(el.lineThickness ?? 1, 0)}mm solid ${el.lineColor ?? '#000'};"></div>`
      }
      break
    }
    case 'box': {
      inner =
        `<div style="width:100%;height:100%;background:${el.backgroundColor ?? 'transparent'};` +
        `border:${el.borderWidth ? `${mm(el.borderWidth, 0)}mm solid ${el.borderColor ?? '#000'}` : '1px solid #ccc'};` +
        `border-radius:${mm(el.borderRadius ?? 4)}mm;box-sizing:border-box;"></div>`
      break
    }
    case 'table': {
      inner = renderTablePreviewHtml(el.tableColumns ?? [], mm, el.tableHeaderFontSize ?? 12, el.tableHeaderBg ?? '#f5f5f5')
      break
    }
  }

  return `<div style="${Object.entries(base).map(([k, v]) => `${k}:${v}`).join(';')}">${inner}</div>`
}

/** Renders a header-only table preview (used by the builder canvas / HTML). */
export function renderTablePreviewHtml(
  columns: PackingSheetColumn[],
  mm: (v: number, min?: number) => number,
  headerFontSize = 12,
  headerBg = '#f5f5f5',
): string {
  if (columns.length === 0) return ''
  const widths = columns.map((c) => mm(c.width, 2)).join('mm;') + 'mm'
  const th = (label: string): string => `<th style="border:1px solid #000;background:${headerBg};text-align:center;font-size:${mm(headerFontSize, 2)}mm;padding:1px 2px;">${escapeHtml(label) || '&nbsp;'}</th>`
  const header = `<tr>${columns.map((c) => th(c.label)).join('')}</tr>`
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;height:100%;"><colgroup><col style="width:${widths}"></colgroup><thead>${header}</thead><tbody></tbody></table>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Fills {token} placeholders in string fields with real values. */
export function fillTagTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => tokens[key] ?? `{${key}}`)
}

const STRING_FIELDS: (keyof TagElement)[] = ['text', 'qrContent', 'barcodeContent', 'imgSrc']

export function resolveTagElements(
  elements: TagElement[],
  tokens: Record<string, string>,
): TagElement[] {
  return elements.map((el) => {
    const copy = { ...el }
    for (const field of STRING_FIELDS) {
      const val = copy[field]
      if (typeof val === 'string') {
        ;(copy as Record<string, unknown>)[field] = fillTagTokens(val, tokens)
      }
    }
    return copy
  })
}

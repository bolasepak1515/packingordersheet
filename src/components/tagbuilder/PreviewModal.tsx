import { useState, useEffect, useRef } from 'react'
import { X, Printer, Image as ImageIcon } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { resolvePreviewElements, sheetSampleRows } from './previewData'
import type { TagElement } from './types'
import TableElementView from './TableElementView'
import Portal from '../Portal'

interface Props {
  elements: TagElement[]
  canvasWidth: number
  canvasHeight: number
  site?: string
  companyName?: string
  onClose: () => void
}

function generateBarcode(value: string, h = 50, w = 1.5): string {
  if (!value) return ''
  const c = document.createElement('canvas')
  try {
    JsBarcode(c, value, { format: 'CODE128', width: w, height: h, displayValue: false, margin: 0, background: '#FFFFFF', lineColor: '#000000' })
    const url = c.toDataURL('image/png')
    if (url && !url.includes('AAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='))
      return url
    JsBarcode(c, value, { format: 'CODE128', width: w, height: h, displayValue: true, margin: 2 })
    return c.toDataURL('image/png')
  } catch {
    return ''
  }
}

export default function PreviewModal({ elements, canvasWidth, canvasHeight, site, companyName, onClose }: Props) {
  const resolved = resolvePreviewElements(elements, { site, companyName })
  const [images, setImages] = useState<Record<string, string>>({})
  const canvasRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<'fit' | number>('fit')
  const [fitDims, setFitDims] = useState({ w: 0, h: 0 })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const node = outerRef.current
    if (!node) return
    const update = () => {
      const cs = getComputedStyle(node)
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      setFitDims({ w: Math.max(0, node.clientWidth - padX), h: Math.max(0, node.clientHeight - padY) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const fitScale = fitDims.w > 0 && fitDims.h > 0
    ? Math.min(fitDims.w / canvasWidth, fitDims.h / canvasHeight, 1)
    : 1
  const currentScale = zoom === 'fit' ? fitScale : zoom

  useEffect(() => {
    const map: Record<string, string> = {}

    const tasks: Promise<void>[] = []

    for (const el of resolved) {
      if (el.type === 'barcode' && el.barcodeContent) {
        const content = el.barcodeContent
        tasks.push(new Promise((resolve) => {
          const dataUrl = generateBarcode(content, Math.min(el.height, 60), 1.5)
          if (dataUrl) map[el.id] = dataUrl
          resolve()
        }))
      }
      if (el.type === 'qrcode' && el.qrContent) {
        const content = el.qrContent
        tasks.push(
          QRCode.toDataURL(content, { width: 300, margin: 1 })
            .then((url) => { map[el.id] = url })
            .catch(() => {}),
        )
      }
    }

    Promise.all(tasks).then(() => setImages(map))
  }, [elements])

  function handlePrint() {
    const tagEl = canvasRef.current
    if (!tagEl) return
    const html = tagEl.outerHTML
    const printDoc = [
      '<!DOCTYPE html>',
      '<html><head><title>Print Tag</title>',
      '<style>',
      '@page { margin:0 }',
      'body { margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; -webkit-print-color-adjust:exact; print-color-adjust:exact }',
      '.tag { position:relative; overflow:hidden; background:#fff }',
      '@media print { body { min-height:auto } }',
      '</style>',
      '</head><body>',
      html,
      '</body></html>',
    ].join('')
    const w = window.open('', '_blank', 'width=' + (canvasWidth + 80) + ',height=' + (canvasHeight + 80))
    if (w) { w.document.write(printDoc); w.document.close() }
  }

  function handleExportPng() {
    const tagEl = canvasRef.current
    if (!tagEl || exporting) return
    setExporting(true)
    try {
      const scale = 2
      const c = document.createElement('canvas')
      c.width = canvasWidth * scale
      c.height = canvasHeight * scale
      const ctx = c.getContext('2d')
      if (!ctx) return

      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      const children = tagEl.querySelectorAll(':scope > div')
      children.forEach((child) => {
        const el = child as HTMLElement
        const left = parseFloat(el.style.left) || 0
        const top = parseFloat(el.style.top) || 0
        const w = parseFloat(el.style.width) || 0
        const h = parseFloat(el.style.height) || 0
        const opacity = parseFloat(el.style.opacity) || 1
        const bg = el.style.background || 'transparent'
        const border = el.style.border || 'none'
        const borderRadius = el.style.borderRadius || '0'
        const color = el.style.color || '#000'
        const fontSize = parseFloat(el.style.fontSize) || 12
        const fontFamily = el.style.fontFamily || 'Arial'
        const fontWeight = el.style.fontWeight || 'normal'
        const fontStyle = el.style.fontStyle || 'normal'
        const textAlign = el.style.textAlign || 'left'

        ctx.globalAlpha = opacity
        ctx.save()
        ctx.translate(left, top)

        const img = child.querySelector('img')
        if (img) {
          ctx.drawImage(img, 0, 0, w, h)
        } else {
          if (bg && bg !== 'transparent') {
            ctx.fillStyle = bg
            const br = parseInt(borderRadius) || 0
            if (br) {
              ctx.beginPath()
              ctx.moveTo(br, 0)
              ctx.lineTo(w - br, 0)
              ctx.quadraticCurveTo(w, 0, w, br)
              ctx.lineTo(w, h - br)
              ctx.quadraticCurveTo(w, h, w - br, h)
              ctx.lineTo(br, h)
              ctx.quadraticCurveTo(0, h, 0, h - br)
              ctx.lineTo(0, br)
              ctx.quadraticCurveTo(0, 0, br, 0)
              ctx.closePath()
              ctx.fill()
            } else {
              ctx.fillRect(0, 0, w, h)
            }
          }
          if (border && border !== 'none') {
            ctx.strokeStyle = border.replace(/^.+\s(.+)$/, '$1')
            ctx.lineWidth = parseFloat(border) || 1
            ctx.strokeRect(0, 0, w, h)
          }
          if (el.children.length > 0) {
            const text = el.childNodes[0]?.textContent || ''
            if (text.trim()) {
              ctx.fillStyle = color
              ctx.font = (fontStyle === 'italic' ? 'italic ' : '') + (fontWeight === 'bold' ? 'bold ' : '') + fontSize + 'px ' + fontFamily
              ctx.textAlign = (textAlign as CanvasTextAlign) || 'left'
              ctx.textBaseline = 'top'
              const lines = text.split('\n')
              lines.forEach((line, i) => {
                const x = textAlign === 'center' ? w / 2 : textAlign === 'right' ? w - 2 : 2
                ctx.fillText(line, x, 2 + i * (fontSize * 1.2))
              })
            }
          }
        }
        ctx.restore()
        ctx.globalAlpha = 1
      })

      const a = document.createElement('a')
      a.href = c.toDataURL('image/png')
      a.download = 'tag-preview.png'
      a.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <Portal>
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1200, padding: 32,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex', flexDirection: 'column',
          background: '#e8e8e8', borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden', maxHeight: '90vh',
        }}
      >
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Design Preview — Live Data
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleExportPng}
              disabled={exporting}
              title="Export as PNG"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                fontSize: 12, border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: exporting ? 'not-allowed' : 'pointer',
                background: 'var(--bg-card)', color: 'var(--text-secondary)',
              }}
            >
              <ImageIcon size={14} />
              PNG
            </button>
            <button
              onClick={handlePrint}
              title="Print tag"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                fontSize: 12, border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', background: 'var(--accent)', color: '#fff',
              }}
            >
              <Printer size={14} />
              Print
            </button>
            <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', padding: 4, borderRadius: 6,
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
            </div>
          </div>

        {/* Canvas */}
        <div ref={outerRef} style={{
          flex: 1, overflow: 'auto', display: 'flex',
          padding: 32, position: 'relative',
        }}>
          <div style={{
            width: canvasWidth * currentScale,
            height: canvasHeight * currentScale,
            position: 'relative',
            flexShrink: 0,
            margin: 'auto',
            transform: `scale(${currentScale})`,
            transformOrigin: 'top left',
          }}>
          <div
            ref={canvasRef}
            style={{
              width: canvasWidth,
              height: canvasHeight,
              background: '#ffffff',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {resolved.map((el) => {
              const imgSrc = images[el.id]
              return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  opacity: el.opacity ?? 1,
                  transform: `rotate(${el.rotation}deg)`,
                  pointerEvents: 'none',
                }}
              >
                {el.type === 'text' && (
                  <div style={{
                    width: '100%', height: '100%',
                    fontSize: el.fontSize ?? 12,
                    fontFamily: el.fontFamily ?? 'Arial',
                    fontWeight: el.fontWeight ?? 'normal',
                    fontStyle: el.fontStyle ?? 'normal',
                    textAlign: el.textAlign ?? 'left',
                    color: el.color ?? '#000',
                    background: el.backgroundColor ?? 'transparent',
                    border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor ?? '#000'}` : 'none',
                    borderRadius: el.borderRadius ?? 0,
                    overflow: 'hidden',
                    padding: 2,
                    boxSizing: 'border-box',
                    wordBreak: 'break-word',
                  }}>
                    {el.text || ''}
                  </div>
                )}
                {el.type === 'box' && (
                  <div style={{
                    width: '100%', height: '100%',
                    background: el.backgroundColor ?? 'transparent',
                    border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor ?? '#000'}` : '1px solid #ccc',
                    borderRadius: el.borderRadius ?? 4,
                    boxSizing: 'border-box',
                  }} />
                )}
                {el.type === 'qrcode' && (
                  imgSrc ? (
                    <img src={imgSrc} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontSize: 10, color: '#ccc' }}>
                      Generating QR…
                    </div>
                  )
                )}
                {el.type === 'barcode' && (
                  imgSrc ? (
                    <img src={imgSrc} alt="Barcode" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontSize: 10, color: '#ccc' }}>
                      Generating barcode…
                    </div>
                  )
                )}
                {el.type === 'image' && (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: el.backgroundColor ?? '#f5f5f5',
                    border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor ?? '#000'}` : 'none',
                    borderRadius: el.borderRadius ?? 0,
                    boxSizing: 'border-box',
                    color: '#999', fontSize: 10, overflow: 'hidden',
                  }}>
                    {el.imgSrc ? (
                      <img src={el.imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span>Logo</span>
                    )}
                  </div>
                )}
                {el.type === 'line' && (
                  <div style={{
                    width: el.lineOrientation === 'vertical' ? (el.lineThickness ?? 1) : '100%',
                    height: el.lineOrientation === 'vertical' ? '100%' : (el.lineThickness ?? 1),
                    background: el.lineColor ?? '#000',
                    margin: el.lineOrientation === 'vertical' ? '0 auto' : 'auto 0',
                    borderRadius: 1,
                  }} />
                )}
                {el.type === 'table' && (
                  <TableElementView el={el} rows={sheetSampleRows(el.tableColumns ?? [])} />
                )}
              </div>
            )})}
          </div>
          </div>

          {/* Zoom control */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 12, right: 16, zIndex: 30,
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'rgba(255,255,255,0.95)', border: '1px solid #d0d0d0',
              borderRadius: 8, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {(['fit', 2, 1.5, 1.25, 1, 0.75, 0.5] as const).map((z) => {
              const active = zoom === z
              const label = z === 'fit' ? `Fit${zoom === 'fit' ? ` (${Math.round(fitScale * 100)}%)` : ''}` : `${Math.round(z * 100)}%`
              return (
                <button key={String(z)} onClick={() => setZoom(z)}
                  style={{
                    padding: '4px 8px', fontSize: 11, border: 'none', borderRadius: 5,
                    cursor: 'pointer', fontWeight: active ? 700 : 500,
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
    </Portal>
  )
}

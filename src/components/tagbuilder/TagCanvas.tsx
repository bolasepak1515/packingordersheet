import { useState, useRef, useCallback, useEffect, type MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import type { TagElement } from './types'
import TableElementView from './TableElementView'

interface Props {
  elements: TagElement[]
  selectedId: string | null
  canvasWidth: number
  canvasHeight: number
  onSelect: (id: string | null) => void
  onUpdate: (id: string, patch: Partial<TagElement>) => void
  onDelete: (id: string) => void
}

interface DragState {
  id: string
  startX: number
  startY: number
  origX: number
  origY: number
}

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'
interface ResizeState {
  id: string
  corner: ResizeCorner
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origH: number
}

function generateBarcode(value: string, h = 60): string {
  if (!value) return ''
  const c = document.createElement('canvas')
  try {
    JsBarcode(c, value, { format: 'CODE128', width: 1.5, height: h, displayValue: false, margin: 0, background: '#FFFFFF', lineColor: '#000000' })
    return c.toDataURL('image/png')
  } catch {
    return ''
  }
}

export default function TagCanvas({ elements, selectedId, canvasWidth, canvasHeight, onSelect, onUpdate, onDelete }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [barcodeImgs, setBarcodeImgs] = useState<Record<string, string>>({})
  const [qrImgs, setQrImgs] = useState<Record<string, string>>({})
  const [resize, setResize] = useState<ResizeState | null>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<'fit' | number>('fit')
  const [fitDims, setFitDims] = useState({ w: 0, h: 0 })

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

  useEffect(() => {
    const bMap: Record<string, string> = {}
    const qMap: Record<string, string> = {}
    const tasks: Promise<void>[] = []

    for (const el of elements) {
      if (el.type === 'barcode' && el.barcodeContent) {
        const url = generateBarcode(el.barcodeContent, Math.min(el.height, 60))
        if (url) bMap[el.id] = url
      }
      if (el.type === 'qrcode' && el.qrContent) {
        tasks.push(
          QRCode.toDataURL(el.qrContent, { width: 200, margin: 1 })
            .then((url) => { qMap[el.id] = url })
            .catch(() => {}),
        )
      }
    }

    Promise.all(tasks).then(() => {
      setBarcodeImgs(bMap)
      setQrImgs(qMap)
    })
  }, [elements])

  const fitScale = fitDims.w > 0 && fitDims.h > 0
    ? Math.min(fitDims.w / canvasWidth, fitDims.h / canvasHeight, 1)
    : 1
  const currentScale = zoom === 'fit' ? fitScale : zoom

  const handleMouseDown = useCallback((e: MouseEvent, el: TagElement) => {
    if (resize) return
    e.stopPropagation()
    onSelect(el.id)
    setDrag({ id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y })
  }, [onSelect, resize])

  const handleCanvasMouseDown = useCallback(() => {
    if (resize) return
    onSelect(null)
  }, [onSelect, resize])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const s = currentScale
    if (resize) {
      const dx = (e.clientX - resize.startX) / s
      const dy = (e.clientY - resize.startY) / s
      const p: Partial<TagElement> = {}
      const MIN = 10

      switch (resize.corner) {
        case 'se':
          p.width = Math.max(MIN, resize.origW + dx)
          p.height = Math.max(MIN, resize.origH + dy)
          break
        case 'sw':
          p.width = Math.max(MIN, resize.origW - dx)
          p.x = resize.origX + resize.origW - Math.max(MIN, resize.origW - dx)
          p.height = Math.max(MIN, resize.origH + dy)
          break
        case 'ne':
          p.width = Math.max(MIN, resize.origW + dx)
          p.height = Math.max(MIN, resize.origH - dy)
          p.y = resize.origY + resize.origH - Math.max(MIN, resize.origH - dy)
          break
        case 'nw':
          p.width = Math.max(MIN, resize.origW - dx)
          p.x = resize.origX + resize.origW - Math.max(MIN, resize.origW - dx)
          p.height = Math.max(MIN, resize.origH - dy)
          p.y = resize.origY + resize.origH - Math.max(MIN, resize.origH - dy)
          break
      }
      onUpdate(resize.id, p)
      return
    }

    if (!drag) return
    const dx = (e.clientX - drag.startX) / s
    const dy = (e.clientY - drag.startY) / s
    onUpdate(drag.id, { x: drag.origX + dx, y: drag.origY + dy })
  }, [drag, resize, currentScale, onUpdate])

  const handleMouseUp = useCallback(() => {
    setDrag(null)
    setResize(null)
  }, [])

  const handleResizeStart = useCallback((e: MouseEvent, id: string, corner: ResizeCorner) => {
    e.stopPropagation()
    e.preventDefault()
    const el = elements.find((x) => x.id === id)
    if (!el) return
    setResize({ id, corner, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.width, origH: el.height })
  }, [elements])

  const selectedEl = elements.find((e) => e.id === selectedId)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!selectedId || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return
      e.preventDefault()
      onDelete(selectedId)
    }
    if (e.key === 'Escape') {
      onSelect(null)
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (!selectedId) return
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      onUpdate(selectedId, { x: (selectedEl?.x ?? 0) + dx, y: (selectedEl?.y ?? 0) + dy })
    }
  }, [selectedId, selectedEl, onDelete, onUpdate, onSelect])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const CORNER_SIZE = 8

  return (
    <div
      ref={outerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        flex: 1,
        display: 'flex',
        background: '#e8e8e8',
        overflow: 'auto',
        padding: 32,
        position: 'relative',
        userSelect: drag || resize ? 'none' : undefined,
        cursor: drag ? 'grabbing' : resize ? 'nwse-resize' : undefined,
      }}
    >
      <div
        style={{
          width: canvasWidth * currentScale,
          height: canvasHeight * currentScale,
          position: 'relative',
          flexShrink: 0,
          margin: 'auto',
        }}
      >
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            background: '#ffffff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            transform: `scale(${currentScale})`,
            transformOrigin: 'top left',
          }}
        >
        {elements.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, color: '#bbb', fontSize: 13,
          }}>
            <span style={{ fontSize: 32 }}>🏷️</span>
            <span>Drag elements from the palette or click to add</span>
          </div>
        )}

        {elements.map((el) => {
          const isSelected = selectedId === el.id
          const isDragging = drag?.id === el.id
          const isHovered = hoveredId === el.id
          const showHandles = isSelected || isHovered
          const bImg = barcodeImgs[el.id]
          const qImg = qrImgs[el.id]

          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleMouseDown(e, el)}
              onMouseEnter={() => setHoveredId(el.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                position: 'absolute',
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                cursor: 'move',
                outline: showHandles ? `2px solid ${isSelected ? 'var(--accent)' : '#aaa'}` : 'none',
                outlineOffset: isDragging ? 1 : 0,
                opacity: el.opacity ?? 1,
                transform: `rotate(${el.rotation}deg)`,
                transition: drag || resize ? 'none' : 'outline 0.15s ease',
                zIndex: isSelected ? 10 : 1,
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
                  {el.text || 'Text'}
                </div>
              )}

              {el.type === 'qrcode' && (
                qImg ? (
                  <img src={qImg} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: el.backgroundColor ?? '#fff',
                    border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor ?? '#000'}` : '1px dashed #ccc',
                    borderRadius: el.borderRadius ?? 0,
                    boxSizing: 'border-box',
                    fontSize: 10, color: '#999',
                    flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ fontSize: Math.min(el.width, el.height) * 0.5 }}>▚</div>
                    <span style={{ fontSize: 8 }}>QR Code</span>
                  </div>
                )
              )}

              {el.type === 'barcode' && (
                bImg ? (
                  <img src={bImg} alt="Barcode" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#fff',
                    border: '1px dashed #ccc',
                    boxSizing: 'border-box',
                    fontSize: 10, color: '#999',
                  }}>
                    Barcode
                  </div>
                )
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

              {el.type === 'image' && (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: el.backgroundColor ?? '#f5f5f5',
                  border: el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor ?? '#000'}` : '1px dashed #ccc',
                  borderRadius: el.borderRadius ?? 0,
                  boxSizing: 'border-box',
                  fontSize: 10, color: '#999',
                  overflow: 'hidden',
                }}>
                  {el.imgSrc ? (
                    <img src={el.imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span>Image</span>
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
                <TableElementView el={el} />
              )}

              {/* Delete handle */}
              {showHandles && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(el.id) }}
                  title="Delete"
                  style={{
                    position: 'absolute', top: -10, right: -10,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--error)', border: '2px solid #fff',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    padding: 0,
                  }}
                >
                  <Trash2 size={10} />
                </button>
              )}

              {/* Resize corners */}
              {isSelected && (
                <>
                  {(['nw', 'ne', 'sw', 'se'] as ResizeCorner[]).map((corner) => {
                    const cStyle: React.CSSProperties = {
                      position: 'absolute',
                      width: CORNER_SIZE,
                      height: CORNER_SIZE,
                      background: '#fff',
                      border: '2px solid var(--accent)',
                      borderRadius: 2,
                      cursor: corner === 'nw' ? 'nwse-resize' : corner === 'se' ? 'nwse-resize' : corner === 'ne' ? 'nesw-resize' : 'nesw-resize',
                      zIndex: 20,
                    }
                    if (corner === 'nw') { cStyle.top = -CORNER_SIZE / 2; cStyle.left = -CORNER_SIZE / 2 }
                    if (corner === 'ne') { cStyle.top = -CORNER_SIZE / 2; cStyle.right = -CORNER_SIZE / 2 }
                    if (corner === 'sw') { cStyle.bottom = -CORNER_SIZE / 2; cStyle.left = -CORNER_SIZE / 2 }
                    if (corner === 'se') { cStyle.bottom = -CORNER_SIZE / 2; cStyle.right = -CORNER_SIZE / 2 }
                    return (
                      <div
                        key={corner}
                        style={cStyle}
                        onMouseDown={(e) => handleResizeStart(e, el.id, corner)}
                      />
                    )
                  })}
                </>
              )}
            </div>
          )
        })}
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
            <button
              key={String(z)}
              onClick={() => setZoom(z)}
              style={{
                padding: '4px 8px', fontSize: 11, border: 'none', borderRadius: 5,
                cursor: 'pointer', fontWeight: active ? 700 : 500,
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

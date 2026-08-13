import { X, Copy, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { TagElement, PackingSheetColumn } from './types'
import { TOKENS, SHEET_DATA_COLUMNS } from './types'
import { toHexColor } from './sanitize'

interface Props {
  element: TagElement | null
  onChange: (id: string, patch: Partial<TagElement>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onLayerMove: (dir: 'up' | 'down' | 'front' | 'back') => void
  onClose: () => void
}

const group: React.CSSProperties = { marginBottom: 12 }
const label: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500,
  color: 'var(--text-secondary)', marginBottom: 3,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const input: React.CSSProperties = {
  width: '100%', padding: '5px 8px',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontSize: 12, outline: 'none', color: 'var(--text-primary)',
  background: 'var(--bg-card)', boxSizing: 'border-box',
}
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }

export default function PropertiesPanel({ element, onChange, onDelete, onDuplicate, onLayerMove, onClose }: Props) {
  if (!element) {
    return (
      <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }}>
        Select an element on the canvas to edit its properties.
      </div>
    )
  }

  const patch = (p: Partial<TagElement>) => onChange(element.id, p)

  function insertToken(token: string) {
    if (!element) return
    switch (element.type) {
      case 'text':
        patch({ text: (element.text ?? '') + token })
        break
      case 'qrcode':
        patch({ qrContent: (element.qrContent ?? '') + token })
        break
      case 'barcode':
        patch({ barcodeContent: (element.barcodeContent ?? '') + token })
        break
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{element.type}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={() => onDuplicate(element.id)} title="Duplicate (Ctrl+D)"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, borderRadius: 4, display: 'flex' }}>
            <Copy size={14} />
          </button>
          <button onClick={() => onLayerMove('back')} title="Send to Back"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, borderRadius: 4, display: 'flex' }}>
            <ChevronDown size={14} />
          </button>
          <button onClick={() => onLayerMove('down')} title="Send Backward"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, borderRadius: 4, display: 'flex' }}>
            <ArrowDown size={14} />
          </button>
          <button onClick={() => onLayerMove('up')} title="Bring Forward"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, borderRadius: 4, display: 'flex' }}>
            <ArrowUp size={14} />
          </button>
          <button onClick={() => onLayerMove('front')} title="Bring to Front"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, borderRadius: 4, display: 'flex' }}>
            <ChevronUp size={14} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, borderRadius: 4, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        {/* Position */}
        <div style={group}>
          <span style={label}>Position</span>
          <div style={row}>
            <div><span style={{ ...label, marginBottom: 2 }}>X</span><input type="number" value={element.x} onChange={(e) => patch({ x: +e.target.value })} style={input} /></div>
            <div><span style={{ ...label, marginBottom: 2 }}>Y</span><input type="number" value={element.y} onChange={(e) => patch({ y: +e.target.value })} style={input} /></div>
          </div>
        </div>

        {/* Size */}
        <div style={group}>
          <span style={label}>Size</span>
          <div style={row}>
            <div><span style={{ ...label, marginBottom: 2 }}>W</span><input type="number" value={element.width} onChange={(e) => patch({ width: +e.target.value })} style={input} min={10} /></div>
            <div><span style={{ ...label, marginBottom: 2 }}>H</span><input type="number" value={element.height} onChange={(e) => patch({ height: +e.target.value })} style={input} min={10} /></div>
          </div>
        </div>

        {/* Rotation */}
        <div style={group}>
          <span style={label}>Rotation</span>
          <input type="number" value={element.rotation} onChange={(e) => patch({ rotation: +e.target.value })} style={input} min={-180} max={180} />
        </div>

        {/* Opacity */}
        <div style={group}>
          <span style={label}>Opacity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={1} step={0.05} value={element.opacity ?? 1}
              onChange={(e) => patch({ opacity: +e.target.value })}
              style={{ flex: 1, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', minWidth: 32 }}>{Math.round((element.opacity ?? 1) * 100)}%</span>
          </div>
        </div>

        {/* Text props */}
        {(element.type === 'text') && (
          <>
            <div style={group}>
              <span style={label}>Text</span>
              <textarea value={element.text ?? ''} onChange={(e) => patch({ text: e.target.value })} style={{ ...input, resize: 'vertical', minHeight: 50 }} />
            </div>
            {/* Token chips */}
            <div style={group}>
              <span style={label}>Insert Token</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {TOKENS.map((t) => (
                  <button key={t.token} onClick={() => insertToken(t.token)}
                    style={{ padding: '2px 6px', fontSize: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {t.token}
                  </button>
                ))}
              </div>
            </div>
            <div style={row}>
              <div style={group}><span style={label}>Font Size</span><input type="number" value={element.fontSize ?? 12} onChange={(e) => patch({ fontSize: +e.target.value })} style={input} min={6} /></div>
              <div style={group}>
                <span style={label}>Font Family</span>
                <select value={element.fontFamily ?? 'Arial'} onChange={(e) => patch({ fontFamily: e.target.value })} style={input}>
                  <option>Arial</option><option>Courier New</option><option>Georgia</option>
                  <option>Times New Roman</option><option>Verdana</option>
                </select>
              </div>
            </div>
            <div style={row}>
              <div style={group}>
                <span style={label}>Weight</span>
                <select value={element.fontWeight ?? 'normal'} onChange={(e) => patch({ fontWeight: e.target.value as 'normal' | 'bold' })} style={input}>
                  <option value="normal">Normal</option><option value="bold">Bold</option>
                </select>
              </div>
              <div style={group}>
                <span style={label}>Style</span>
                <select value={element.fontStyle ?? 'normal'} onChange={(e) => patch({ fontStyle: e.target.value as 'normal' | 'italic' })} style={input}>
                  <option value="normal">Normal</option><option value="italic">Italic</option>
                </select>
              </div>
            </div>
            <div style={group}>
              <span style={label}>Align</span>
              <select value={element.textAlign ?? 'left'} onChange={(e) => patch({ textAlign: e.target.value as 'left' | 'center' | 'right' })} style={input}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
            </div>
            <div style={group}>
              <span style={label}>Color</span>
              <input type="color" value={toHexColor(element.color, '#000000')} onChange={(e) => patch({ color: e.target.value })} style={{ width: '100%', height: 32, padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }} />
            </div>
          </>
        )}

        {/* QR props */}
        {(element.type === 'qrcode') && (
          <div style={group}>
            <span style={label}>QR Content</span>
            <textarea value={element.qrContent ?? ''} onChange={(e) => patch({ qrContent: e.target.value })} style={{ ...input, resize: 'vertical', minHeight: 50 }} placeholder="URL or text to encode" />
            <div style={{ ...group, marginTop: 8 }}>
              <span style={label}>Insert Token</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {TOKENS.map((t) => (
                  <button key={t.token} onClick={() => insertToken(t.token)}
                    style={{ padding: '2px 6px', fontSize: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {t.token}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Barcode props */}
        {(element.type === 'barcode') && (
          <>
            <div style={group}>
              <span style={label}>Barcode Content</span>
              <input value={element.barcodeContent ?? ''} onChange={(e) => patch({ barcodeContent: e.target.value })} style={input} placeholder="Data to encode" />
              <div style={{ ...group, marginTop: 8 }}>
                <span style={label}>Insert Token</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {TOKENS.map((t) => (
                    <button key={t.token} onClick={() => insertToken(t.token)}
                      style={{ padding: '2px 6px', fontSize: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {t.token}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={group}>
              <span style={label}>Format</span>
              <select value={element.barcodeFormat ?? 'CODE128'} onChange={(e) => patch({ barcodeFormat: e.target.value as 'CODE128' | 'EAN13' | 'UPC' })} style={input}>
                <option>CODE128</option><option>EAN13</option><option>UPC</option>
              </select>
            </div>
          </>
        )}

        {/* Table props */}
        {element.type === 'table' && (
          <TableProperties
            columns={element.tableColumns ?? []}
            headerFontSize={element.tableHeaderFontSize ?? 12}
            bodyFontSize={element.tableBodyFontSize ?? 13}
            rowHeight={element.tableRowHeight ?? 40}
            headerBg={element.tableHeaderBg ?? '#f5f5f5'}
            onChange={(p) => patch(p)}
          />
        )}

        {/* Image */}
        {element.type === 'image' && (
          <div style={group}>
            <span style={label}>Image URL</span>
            <input value={element.imgSrc ?? ''} onChange={(e) => patch({ imgSrc: e.target.value })} style={input} placeholder="https://..." />
          </div>
        )}

        {/* Box */}
        {element.type === 'box' && (
          <div style={group}>
            <span style={label}>Border Radius</span>
            <input type="number" value={element.borderRadius ?? 4} onChange={(e) => patch({ borderRadius: +e.target.value })} style={input} min={0} />
          </div>
        )}

        {/* Line */}
        {element.type === 'line' && (
          <>
            <div style={group}>
              <span style={label}>Orientation</span>
              <select value={element.lineOrientation ?? 'horizontal'} onChange={(e) => patch({ lineOrientation: e.target.value as 'horizontal' | 'vertical' })} style={input}>
                <option value="horizontal">Horizontal</option><option value="vertical">Vertical</option>
              </select>
            </div>
            <div style={group}><span style={label}>Thickness</span><input type="number" value={element.lineThickness ?? 1} onChange={(e) => patch({ lineThickness: +e.target.value })} style={input} min={1} /></div>
            <div style={group}>
              <span style={label}>Color</span>
              <input type="color" value={toHexColor(element.lineColor, '#000000')} onChange={(e) => patch({ lineColor: e.target.value })} style={{ width: '100%', height: 32, padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }} />
            </div>
          </>
        )}

        {/* Common border (not for line/box which have their own) */}
        {element.type !== 'line' && element.type !== 'box' && (
          <div style={group}>
            <span style={label}>Border</span>
            <div style={row}>
              <div><span style={{ ...label, marginBottom: 2 }}>Width</span><input type="number" value={element.borderWidth ?? 0} onChange={(e) => patch({ borderWidth: +e.target.value })} style={input} min={0} /></div>
              <div><span style={{ ...label, marginBottom: 2 }}>Color</span><input type="color" value={toHexColor(element.borderColor, '#000000')} onChange={(e) => patch({ borderColor: e.target.value })} style={{ width: '100%', height: 32, padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }} /></div>
            </div>
          </div>
        )}

        {/* Box border (has its own border section) */}
        {element.type === 'box' && (
          <div style={group}>
            <span style={label}>Border</span>
            <div style={row}>
              <div><span style={{ ...label, marginBottom: 2 }}>Width</span><input type="number" value={element.borderWidth ?? 1} onChange={(e) => patch({ borderWidth: +e.target.value })} style={input} min={0} /></div>
              <div><span style={{ ...label, marginBottom: 2 }}>Color</span><input type="color" value={toHexColor(element.borderColor, '#999999')} onChange={(e) => patch({ borderColor: e.target.value })} style={{ width: '100%', height: 32, padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }} /></div>
            </div>
          </div>
        )}

        {/* Background */}
        {element.type !== 'line' && (
          <div style={group}>
            <span style={label}>Background</span>
            <input type="color" value={toHexColor(element.backgroundColor, '#ffffff')} onChange={(e) => patch({ backgroundColor: e.target.value })} style={{ width: '100%', height: 32, padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }} />
          </div>
        )}

        {/* Delete */}
        <button onClick={() => onDelete(element.id)} style={{
          width: '100%', padding: '8px 0', marginTop: 8,
          background: 'var(--error-bg)', border: '1px solid var(--error-border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          color: 'var(--error)', fontSize: 12, fontWeight: 500,
        }}>
          Delete Element
        </button>
      </div>
    </div>
  )
}

function newColumnId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function TableProperties(props: {
  columns: PackingSheetColumn[]
  headerFontSize: number
  bodyFontSize: number
  rowHeight: number
  headerBg: string
  onChange: (p: Partial<TagElement>) => void
}) {
  const { columns, headerFontSize, bodyFontSize, rowHeight, headerBg, onChange } = props

  function updateColumn(id: string, p: Partial<PackingSheetColumn>) {
    onChange({ tableColumns: columns.map((c) => (c.id === id ? { ...c, ...p } : c)) })
  }

  function removeColumn(id: string) {
    onChange({ tableColumns: columns.filter((c) => c.id !== id) })
  }

  function addColumn() {
    const width = columns.length > 0 ? columns[columns.length - 1].width : 38
    onChange({ tableColumns: [...columns, { id: newColumnId(), label: 'Column', sublabel: '', width, dataKey: '', align: 'center' }] })
  }

  const colBox: React.CSSProperties = {
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: 8, marginBottom: 8, background: 'var(--bg)',
  }
  const removeBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 3,
    padding: '4px 8px', fontSize: 11, border: '1px solid var(--error-border)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    background: 'var(--error-bg)', color: 'var(--error)',
  }

  return (
    <>
      <div style={group}>
        <span style={label}>Table Style</span>
        <div style={row}>
          <div><span style={{ ...label, marginBottom: 2 }}>Header Font</span><input type="number" value={headerFontSize} onChange={(e) => onChange({ tableHeaderFontSize: +e.target.value })} style={input} min={6} /></div>
          <div><span style={{ ...label, marginBottom: 2 }}>Body Font</span><input type="number" value={bodyFontSize} onChange={(e) => onChange({ tableBodyFontSize: +e.target.value })} style={input} min={6} /></div>
        </div>
        <div style={{ ...row, marginTop: 8 }}>
          <div><span style={{ ...label, marginBottom: 2 }}>Row Height</span><input type="number" value={rowHeight} onChange={(e) => onChange({ tableRowHeight: +e.target.value })} style={input} min={12} /></div>
          <div>
            <span style={{ ...label, marginBottom: 2 }}>Header BG</span>
            <input type="color" value={toHexColor(headerBg, '#f5f5f5')} onChange={(e) => onChange({ tableHeaderBg: e.target.value })} style={{ width: '100%', height: 32, padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }} />
          </div>
        </div>
      </div>

      <div style={group}>
        <span style={label}>Columns ({columns.length})</span>
        {columns.map((c) => (
          <div key={c.id} style={colBox}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1 }}><span style={{ ...label, marginBottom: 2 }}>Label</span><input value={c.label ?? ''} onChange={(e) => updateColumn(c.id, { label: e.target.value })} style={input} /></div>
              <div style={{ width: 70 }}><span style={{ ...label, marginBottom: 2 }}>Width</span><input type="number" value={c.width ?? 38} onChange={(e) => updateColumn(c.id, { width: +e.target.value })} style={input} min={8} /></div>
            </div>
            <div style={{ ...row, marginTop: 6 }}>
              <div><span style={{ ...label, marginBottom: 2 }}>Sublabel (2nd row)</span><input value={c.sublabel ?? ''} onChange={(e) => updateColumn(c.id, { sublabel: e.target.value })} style={input} placeholder="Leave blank to span rows" /></div>
              <div><span style={{ ...label, marginBottom: 2 }}>Data</span><select value={c.dataKey ?? ''} onChange={(e) => updateColumn(c.id, { dataKey: e.target.value })} style={input}>
                <option value="">(empty)</option>
                {SHEET_DATA_COLUMNS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                <optgroup label="Tokens">
                  {TOKENS.map((t) => <option key={t.token} value={t.token.slice(1, -1)}>{t.token}</option>)}
                </optgroup>
              </select></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <select value={c.align ?? 'center'} onChange={(e) => updateColumn(c.id, { align: e.target.value as 'left' | 'center' | 'right' })} style={{ ...input, width: 90 }}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
              <button onClick={() => removeColumn(c.id)} style={removeBtn}>
                <Trash2 size={12} /> Remove
              </button>
            </div>
          </div>
        ))}
        <button onClick={addColumn} style={{
          width: '100%', padding: '7px 0', fontSize: 12, border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          background: 'var(--bg)', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <Plus size={14} /> Add Column
        </button>
      </div>
    </>
  )
}

import { useState, useCallback, useRef, useEffect } from 'react'
import { Type, QrCode, Barcode, Image, Minus, Save, Eye, EyeOff, Undo2, Redo2, Square, Upload, RotateCcw, Copy, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Table as TableIcon } from 'lucide-react'
import TagCanvas from '@/components/tagbuilder/TagCanvas'
import PropertiesPanel from '@/components/tagbuilder/PropertiesPanel'
import PreviewModal from '@/components/tagbuilder/PreviewModal'
import { useAuth } from '@/contexts/AuthContext'
import { getDefaultTemplate } from '@/components/tagbuilder/defaultTemplate'
import { getDefaultSheetTemplate, SHEET_CANVAS_W, SHEET_CANVAS_H } from '@/components/tagbuilder/defaultSheetTemplate'
import type { TagTemplateRow } from '@/lib/db'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/hooks/queryKeys'
import { useTagTemplate, usePackingSheetTemplate, useSaveTagTemplate, useSavePackingSheetTemplate } from '@/hooks/useMasterData'
import { supabase } from '@/lib/supabase'
import type { TagElement, ElementType } from '@/components/tagbuilder/types'

const CANVAS_PRESETS = [
  { label: '4×6 in', w: 600, h: 900 },
  { label: '3×5 in', w: 450, h: 750 },
  { label: '80mm Tag', w: 300, h: 850 },
  { label: 'A4', w: 794, h: 1123 },
]

type BuilderMode = 'tag' | 'sheet'

let _seed = 0
function nextId() { return `el_${++_seed}` }

const paletteItems: { type: ElementType; icon: typeof Type; label: string; defaultEl: () => TagElement }[] = [
  { type: 'text', icon: Type, label: 'Text', defaultEl: () => ({ id: nextId(), type: 'text', x: 40, y: 40, width: 200, height: 30, rotation: 0, text: 'Label Text', fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left', color: '#000000', backgroundColor: 'transparent', opacity: 1 }) },
  { type: 'qrcode', icon: QrCode, label: 'QR Code', defaultEl: () => ({ id: nextId(), type: 'qrcode', x: 40, y: 40, width: 100, height: 100, rotation: 0, qrContent: 'https://example.com', opacity: 1 }) },
  { type: 'barcode', icon: Barcode, label: 'Barcode', defaultEl: () => ({ id: nextId(), type: 'barcode', x: 40, y: 40, width: 200, height: 60, rotation: 0, barcodeContent: '1234567890', barcodeFormat: 'CODE128', opacity: 1 }) },
  { type: 'image', icon: Image, label: 'Image', defaultEl: () => ({ id: nextId(), type: 'image', x: 40, y: 40, width: 80, height: 80, rotation: 0, imgSrc: '', opacity: 1 }) },
  { type: 'line', icon: Minus, label: 'Line', defaultEl: () => ({ id: nextId(), type: 'line', x: 40, y: 40, width: 300, height: 2, rotation: 0, lineOrientation: 'horizontal', lineThickness: 2, lineColor: '#000000', opacity: 1 }) },
  { type: 'box', icon: Square, label: 'Box', defaultEl: () => ({ id: nextId(), type: 'box', x: 40, y: 40, width: 200, height: 100, rotation: 0, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#999', borderRadius: 4, opacity: 1 }) },
  { type: 'table', icon: TableIcon, label: 'Table', defaultEl: () => ({ id: nextId(), type: 'table', x: 40, y: 40, width: 240, height: 150, rotation: 0, tableColumns: Array.from({ length: 3 }, () => ({ id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, label: 'Column', sublabel: '', width: 80, dataKey: '', align: 'center' })), tableRowHeight: 40, tableHeaderFontSize: 12, tableBodyFontSize: 13, tableHeaderBg: '#f5f5f5', opacity: 1 }) },
]

export default function TagBuilderPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<BuilderMode>('tag')
  const [elements, setElements] = useState<TagElement[]>(() => {
    const cached = queryClient.getQueryData<TagTemplateRow | null>(queryKeys.templates.tag)
    const tpl = (cached && Array.isArray(cached.elements) && cached.elements.length > 0)
      ? cached.elements
      : getDefaultTemplate()
    _seed = Math.max(0, ...tpl.map((e) => parseInt(e.id.replace('el_', ''))))
    return tpl
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tagPreset, setTagPreset] = useState(CANVAS_PRESETS[2])
  const [sheetPreset] = useState({ label: 'A4', w: SHEET_CANVAS_W, h: SHEET_CANVAS_H })
  const [showGrid, setShowGrid] = useState(true)
  const [showProps, setShowProps] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [loginSite, setLoginSite] = useState(user?.site ?? '')
  const [loginCompanyName, setLoginCompanyName] = useState(user?.companyname ?? '')

  // Stored sessions created before the companyname field existed lack it, so
  // always fetch the live login row for the preview tokens.
  useEffect(() => {
    if (!user?.username) return
    let cancelled = false
    void (async () => {
      try {
        const { data } = await supabase.from('packinglogin').select('site, companyname').eq('username', user.username).maybeSingle()
        if (cancelled || !data) return
        if (data.site) setLoginSite(data.site)
        if (data.companyname) setLoginCompanyName(data.companyname)
      } catch {
        // keep session fallbacks
      }
    })()
    return () => { cancelled = true }
  }, [user?.username])

  const { data: tagTpl } = useTagTemplate()
  const { data: sheetTpl } = usePackingSheetTemplate()
  const tagSaveMutation = useSaveTagTemplate()
  const sheetSaveMutation = useSavePackingSheetTemplate()
  const activeTpl = mode === 'tag' ? tagTpl : sheetTpl
  const lastAppliedRef = useRef<TagTemplateRow | null | undefined>(undefined)

  const canvasPreset = mode === 'sheet' ? sheetPreset : tagPreset

  useEffect(() => {
    if (activeTpl === undefined) return
    if (lastAppliedRef.current === activeTpl) return
    lastAppliedRef.current = activeTpl
    const els = (activeTpl && Array.isArray(activeTpl.elements) && activeTpl.elements.length > 0)
      ? activeTpl.elements
      : (mode === 'tag' ? getDefaultTemplate() : getDefaultSheetTemplate())
    _seed = Math.max(0, ...els.map((e: TagElement) => parseInt(e.id.replace('el_', ''))))
    setElements(els)
    setSelectedId(null)
  }, [mode, activeTpl])

  const selectedEl = elements.find((e) => e.id === selectedId) ?? null

  const canvasHeight = mode === 'sheet'
    ? canvasPreset.h
    : (elements.length === 0
      ? canvasPreset.h
      : Math.max(60, ...elements.map((e) => e.y + e.height + 20)))

  /* Undo / Redo */
  const pastRef = useRef<TagElement[][]>([])
  const futureRef = useRef<TagElement[][]>([])
  const elsRef = useRef(elements)
  elsRef.current = elements
  const saveTimer = useRef(0)
  const MAX_HISTORY = 50

  function saveHistory() {
    const now = Date.now()
    if (now - saveTimer.current < 200) return
    saveTimer.current = now
    pastRef.current = [...pastRef.current.slice(-MAX_HISTORY + 1), elsRef.current]
    futureRef.current = []
  }

  function handleUndo() {
    if (pastRef.current.length === 0) return
    const prev = pastRef.current[pastRef.current.length - 1]
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [...futureRef.current, elsRef.current]
    setElements(prev)
  }

  function handleRedo() {
    if (futureRef.current.length === 0) return
    const next = futureRef.current[futureRef.current.length - 1]
    futureRef.current = futureRef.current.slice(0, -1)
    pastRef.current = [...pastRef.current, elsRef.current]
    setElements(next)
  }

  const handleAdd = useCallback((type: ElementType) => {
    saveHistory()
    const item = paletteItems.find((p) => p.type === type)
    if (!item) return
    const el = item.defaultEl()
    const stagger = (elsRef.current.length % 8) * 18
    el.x = 40 + stagger
    el.y = 40 + stagger
    setElements((prev) => [...prev, el])
    setSelectedId(el.id)
  }, [])

  const handleUpdate = useCallback((id: string, patch: Partial<TagElement>) => {
    saveHistory()
    setElements((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e))
  }, [])

  const handleDelete = useCallback((id: string) => {
    saveHistory()
    setElements((prev) => prev.filter((e) => e.id !== id))
    setSelectedId((prev) => prev === id ? null : prev)
  }, [])

  const handleSaveTemplate = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const saved = mode === 'sheet'
        ? await sheetSaveMutation.mutateAsync({ elements, canvasWidth: canvasPreset.w, canvasHeight })
        : await tagSaveMutation.mutateAsync({ elements, canvasWidth: canvasPreset.w, canvasHeight })
      lastAppliedRef.current = saved
      const blob = new Blob([JSON.stringify(elements, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = mode === 'sheet' ? 'packing-sheet-template.json' : 'tag-template.json'
      a.click()
      URL.revokeObjectURL(url)
      setSaveMsg({ text: mode === 'sheet' ? 'Packing Sheet template saved. The Packing Sheet button will use the new version.' : 'Template saved. PDF button will use the new version.', type: 'success' })
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (err) {
      setSaveMsg({ text: 'Save failed: ' + (err instanceof Error ? err.message : String(err)), type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [elements, canvasPreset.w, canvasHeight, saving, mode, tagSaveMutation, sheetSaveMutation])

  const handleImportTemplate = useCallback(() => {
    importRef.current?.click()
  }, [])

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as TagElement[]
        if (!Array.isArray(data)) throw new Error('Invalid format')
        saveHistory()
        setElements(data)
        setSelectedId(null)
      } catch {
        alert('Invalid template file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleResetDefault = useCallback(() => {
    if (elements.length > 0 && !confirm('Reset to default template? Current changes will be lost.')) return
    saveHistory()
    const tpl = mode === 'tag' ? getDefaultTemplate() : getDefaultSheetTemplate()
    _seed = Math.max(0, ...tpl.map((el) => parseInt(el.id.replace('el_', ''))))
    setElements(tpl)
    setSelectedId(null)
  }, [elements, mode])

  function duplicateElement(id: string) {
    const el = elements.find((e) => e.id === id)
    if (!el) return
    saveHistory()
    _seed = Math.max(_seed, parseInt(id.replace('el_', '')))
    const copy: TagElement = { ...el, id: nextId(), x: el.x + 20, y: el.y + 20 }
    setElements((prev) => [...prev, copy])
    setSelectedId(copy.id)
  }

  function moveLayer(id: string, dir: 'up' | 'down' | 'front' | 'back') {
    saveHistory()
    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === id)
      if (idx === -1) return prev
      const arr = [...prev]
      if (dir === 'up' && idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]] }
      if (dir === 'down' && idx > 0) { [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]] }
      if (dir === 'front') { const [item] = arr.splice(idx, 1); arr.push(item) }
      if (dir === 'back') { const [item] = arr.splice(idx, 1); arr.unshift(item) }
      return arr
    })
  }

  function alignElements(align: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') {
    const sel = elements.find((e) => e.id === selectedId)
    if (!sel) return
    saveHistory()
    setElements((prev) => {
      const maxX = Math.max(...prev.map((e) => e.x))
      const minX = Math.min(...prev.map((e) => e.x))
      const maxY = Math.max(...prev.map((e) => e.y))
      const minY = Math.min(...prev.map((e) => e.y))
      const avgX = Math.round((minX + maxX) / 2)
      const avgY = Math.round((minY + maxY) / 2)
      return prev.map((e) => {
        if (align === 'left') return { ...e, x: minX }
        if (align === 'right') return { ...e, x: maxX }
        if (align === 'centerH') return { ...e, x: avgX - e.width / 2 }
        if (align === 'top') return { ...e, y: minY }
        if (align === 'bottom') return { ...e, y: maxY }
        if (align === 'centerV') return { ...e, y: avgY - e.height / 2 }
        return e
      })
    })
  }

  /* Global keyboard shortcuts */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo() }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        if (selectedId) duplicateElement(selectedId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  const canUndo = pastRef.current.length > 0
  const canRedo = futureRef.current.length > 0

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Design Builder</h1>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button onClick={() => setMode('tag')}
              style={{
                padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: 'none',
                background: mode === 'tag' ? 'var(--accent)' : 'var(--bg-card)',
                color: mode === 'tag' ? '#fff' : 'var(--text-secondary)',
              }}>
              Tag Label
            </button>
            <button onClick={() => setMode('sheet')}
              style={{
                padding: '4px 10px', fontSize: 12, cursor: 'pointer', border: 'none',
                background: mode === 'sheet' ? 'var(--accent)' : 'var(--bg-card)',
                color: mode === 'sheet' ? '#fff' : 'var(--text-secondary)',
              }}>
              A4 Packing Sheet
            </button>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{elements.length} element{elements.length !== 1 ? 's' : ''} · {canvasPreset.label} · {canvasHeight}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Undo/Redo */}
          <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            style={{
              display: 'flex', padding: '5px 8px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: canUndo ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: canUndo ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: canUndo ? 1 : 0.4,
            }}>
            <Undo2 size={14} />
          </button>
          <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            style={{
              display: 'flex', padding: '5px 8px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: canRedo ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: canRedo ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: canRedo ? 1 : 0.4,
            }}>
            <Redo2 size={14} />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          {/* Duplicate */}
          <button onClick={() => selectedId && duplicateElement(selectedId)} disabled={!selectedId} title="Duplicate (Ctrl+D)"
            style={{
              display: 'flex', padding: '5px 8px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: selectedId ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: selectedId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: selectedId ? 1 : 0.4,
            }}>
            <Copy size={14} />
          </button>

          {/* Alignment */}
          <button onClick={() => alignElements('left')} disabled={!selectedId} title="Align Left"
            style={{
              display: 'flex', padding: '5px 6px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: selectedId ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: selectedId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: selectedId ? 1 : 0.4,
            }}>
            <AlignStartHorizontal size={14} />
          </button>
          <button onClick={() => alignElements('centerH')} disabled={!selectedId} title="Align Center H"
            style={{
              display: 'flex', padding: '5px 6px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: selectedId ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: selectedId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: selectedId ? 1 : 0.4,
            }}>
            <AlignCenterHorizontal size={14} />
          </button>
          <button onClick={() => alignElements('right')} disabled={!selectedId} title="Align Right"
            style={{
              display: 'flex', padding: '5px 6px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: selectedId ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: selectedId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: selectedId ? 1 : 0.4,
            }}>
            <AlignEndHorizontal size={14} />
          </button>
          <button onClick={() => alignElements('top')} disabled={!selectedId} title="Align Top"
            style={{
              display: 'flex', padding: '5px 6px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: selectedId ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: selectedId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: selectedId ? 1 : 0.4,
            }}>
            <AlignStartVertical size={14} />
          </button>
          <button onClick={() => alignElements('centerV')} disabled={!selectedId} title="Align Center V"
            style={{
              display: 'flex', padding: '5px 6px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: selectedId ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: selectedId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: selectedId ? 1 : 0.4,
            }}>
            <AlignCenterVertical size={14} />
          </button>
          <button onClick={() => alignElements('bottom')} disabled={!selectedId} title="Align Bottom"
            style={{
              display: 'flex', padding: '5px 6px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: selectedId ? 'pointer' : 'not-allowed',
              background: 'var(--bg-card)', color: selectedId ? 'var(--text-primary)' : 'var(--text-tertiary)',
              opacity: selectedId ? 1 : 0.4,
            }}>
            <AlignEndVertical size={14} />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          <select value={canvasPreset.label} onChange={(e) => {
            if (mode !== 'tag') return
            const p = CANVAS_PRESETS.find((c) => c.label === e.target.value) ?? CANVAS_PRESETS[0]
            setTagPreset(p)
          }} disabled={mode === 'sheet'} style={{
            padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', outline: 'none',
            background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: mode === 'sheet' ? 'not-allowed' : 'pointer',
            opacity: mode === 'sheet' ? 0.6 : 1,
          }}>
            {CANVAS_PRESETS.map((p) => <option key={p.label}>{p.label}</option>)}
          </select>

          <button onClick={() => setShowGrid((p) => !p)} title="Toggle grid"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
              fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
            }}>
            {showGrid ? <EyeOff size={14} /> : <Eye size={14} />} Grid
          </button>

          <button onClick={() => setShowProps((p) => !p)} title="Toggle properties"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
              fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
            }}>
            {showProps ? 'Hide' : 'Show'}
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          {/* Import / Reset */}
          <input ref={importRef} type="file" accept=".json" onChange={handleFileSelected} style={{ display: 'none' }} />
          <button onClick={handleImportTemplate} title="Import template"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
              fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
            }}>
            <Upload size={14} /> Import
          </button>
          <button onClick={handleResetDefault} title="Reset to default template"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
              fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: 'var(--bg-card)', color: 'var(--text-secondary)',
            }}>
            <RotateCcw size={14} /> Reset
          </button>

          <button onClick={() => setShowPreview(true)} disabled={elements.length === 0} title="Preview with live data"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
              fontSize: 12, border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: elements.length === 0 ? 'not-allowed' : 'pointer',
              background: elements.length === 0 ? 'var(--bg)' : 'var(--accent)',
              color: elements.length === 0 ? 'var(--text-tertiary)' : '#fff',
            }}>
            <Eye size={14} /> Preview
          </button>
          <button onClick={handleSaveTemplate} disabled={elements.length === 0 || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
              fontSize: 12, border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: elements.length === 0 || saving ? 'not-allowed' : 'pointer',
              background: elements.length === 0 || saving ? 'var(--bg)' : 'var(--accent)',
              color: elements.length === 0 || saving ? 'var(--text-tertiary)' : '#fff',
            }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {saveMsg && (
        <div style={{
          padding: '6px 16px', fontSize: 12,
          background: saveMsg.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
          borderBottom: '1px solid ' + (saveMsg.type === 'success' ? 'var(--success-border)' : 'var(--error-border)'),
          color: saveMsg.type === 'success' ? 'var(--success)' : 'var(--error)',
        }}>
          {saveMsg.text}
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left palette */}
        <div style={{
          width: 200, flexShrink: 0, background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Elements
          </div>
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paletteItems.map((item) => (
              <button key={item.type} onClick={() => handleAdd(item.type)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', cursor: 'grab',
                  background: 'transparent', color: 'var(--text-primary)',
                  fontSize: 13, fontWeight: 500, transition: 'background 0.12s ease',
                }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={15} />
                </div>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <TagCanvas elements={elements} selectedId={selectedId}
          canvasWidth={canvasPreset.w} canvasHeight={canvasHeight}
          onSelect={setSelectedId} onUpdate={handleUpdate} onDelete={handleDelete} />

        {/* Right properties panel */}
        {showProps && (
          <div style={{
            width: 260, flexShrink: 0, background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border)', overflowY: 'auto',
          }}>
            <PropertiesPanel element={selectedEl} onChange={handleUpdate}
              onDelete={handleDelete} onDuplicate={duplicateElement}
              onLayerMove={(dir) => selectedId && moveLayer(selectedId, dir)}
              onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>

      {showPreview && (
        <PreviewModal elements={elements} canvasWidth={canvasPreset.w} canvasHeight={canvasHeight}
          site={loginSite} companyName={loginCompanyName}
          onClose={() => setShowPreview(false)} />
      )}
    </div>
  )
}

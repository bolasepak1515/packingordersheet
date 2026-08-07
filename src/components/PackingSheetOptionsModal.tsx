import { useEffect, useState } from 'react'
import { X, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Portal from './Portal'

interface Props {
  defaultSite?: string
  defaultCompanyName?: string
  onConfirm: (site: string, companyName: string) => void
  onClose: () => void
}

export default function PackingSheetOptionsModal({ defaultSite, defaultCompanyName, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<string[]>([])
  const [companyNames, setCompanyNames] = useState<string[]>([])
  const [site, setSite] = useState(defaultSite ?? '')
  const [companyName, setCompanyName] = useState(defaultCompanyName ?? '')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data } = await supabase.from('packinglogin').select('site, companyname')
        const rows = (data ?? []) as { site: string | null; companyname: string | null }[]
        const uniqueSites = Array.from(new Set(rows.map((r) => r.site?.trim()).filter(Boolean))) as string[]
        const uniqueNames = Array.from(new Set(rows.map((r) => r.companyname?.trim()).filter(Boolean))) as string[]
        if (cancelled) return
        setSites(uniqueSites)
        setCompanyNames(uniqueNames)
        setSite((prev) => (prev && uniqueSites.includes(prev) ? prev : (uniqueSites[0] ?? '')))
        setCompanyName((prev) => (prev && uniqueNames.includes(prev) ? prev : (uniqueNames[0] ?? '')))
      } catch {
        // fall back to empty lists
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const canConfirm = !loading && Boolean(site || companyName)

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 13,
    background: '#fff',
    color: '#0f172a',
  }

  return (
    <Portal>
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        backdropFilter: 'blur(4px)',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(92vw, 460px)',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div style={{ background: '#1e293b', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} /> Packing Sheet Options
          </h2>
          <button
            onClick={onClose}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: '#64748b' }}>Loading sites &amp; company names…</div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Site</label>
                <select value={site} onChange={(e) => setSite(e.target.value)} style={selectStyle}>
                  {sites.length === 0 && <option value="">No sites available</option>}
                  {sites.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Company Name</label>
                <select value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={selectStyle}>
                  {companyNames.length === 0 && <option value="">No company names available</option>}
                  {companyNames.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  onClick={onClose}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  disabled={!canConfirm}
                  onClick={() => onConfirm(site, companyName)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: canConfirm ? '#2563eb' : '#cbd5e1',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: canConfirm ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <FileText size={14} /> Generate
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </Portal>
  )
}

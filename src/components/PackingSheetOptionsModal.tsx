import { useEffect, useState } from 'react'
import { X, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Portal from './Portal'

interface Props {
  /** Sites involved in the order being printed (from JobHead_Plant). */
  sites: string[]
  defaultSite?: string
  defaultCompanyName?: string
  onConfirm: (site: string, companyName: string, printAll: boolean) => void
  onClose: () => void
}

export default function PackingSheetOptionsModal({ sites, defaultSite, defaultCompanyName, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({})
  const [site, setSite] = useState('')
  const [printAll, setPrintAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data } = await supabase.from('packinglogin').select('site, companyname')
        const map: Record<string, string> = {}
        for (const r of (data ?? []) as { site: string | null; companyname: string | null }[]) {
          const s = r.site?.trim()
          const c = r.companyname?.trim()
          if (s && c && !(s in map)) map[s] = c
        }
        if (cancelled) return
        setCompanyMap(map)
      } catch {
        // fall back to an empty map
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Only the sites involved in this order are offered; default to the admin's own
  // site when it is involved, otherwise the first involved site.
  useEffect(() => {
    if (sites.length > 0) {
      setSite((prev) => {
        if (prev && sites.includes(prev)) return prev
        if (defaultSite && sites.includes(defaultSite)) return defaultSite
        return sites[0]
      })
    }
  }, [sites, defaultSite])

  const companyName = companyMap[site] ?? defaultCompanyName ?? ''
  const canConfirm = !loading && Boolean(site)

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
            <div style={{ fontSize: 13, color: '#64748b' }}>Loading company info…</div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Site</label>
                <select value={site} onChange={(e) => setSite(e.target.value)} style={selectStyle}>
                  {sites.length === 0 && <option value="">No sites involved</option>}
                  {sites.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Only the sites involved in this order are listed.
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Company Name</label>
                <input
                  readOnly
                  value={companyName || '—'}
                  style={{ ...selectStyle, color: '#64748b', background: '#f1f5f9', cursor: 'not-allowed' }}
                />
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Auto-detected from the packinglogin table for the selected site.
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={printAll} onChange={(e) => setPrintAll(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                Print All (include every involved site's data in the Loading Sequence)
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  onClick={onClose}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  disabled={!canConfirm}
                  onClick={() => onConfirm(site, companyName, printAll)}
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

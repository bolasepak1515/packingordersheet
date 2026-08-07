import { useState, useCallback } from 'react'
import { X, Copy, Check, Factory, Package, MapPin, Calendar, Layers, FileText, ClipboardList } from 'lucide-react'
import Button from './Button'
const generatePdf = () =>
  import('@/utils/generateMiniLotPdf').then((m) => m.generateMiniLotPdf)
import { formatLotNum, padNum, formatDateOrRaw, parseLineDesc } from '@/utils/format'
import type { JobOrder, CartonRange, PalletInfo } from '@/types'
import Portal from './Portal'

interface Props {
  row: JobOrder | null
  onClose: () => void
  allData: JobOrder[]
  filtered: JobOrder[]
  cartonLots: Record<string, string>
  cartonNums?: Record<string, string>
  palletData: Record<string, PalletInfo>
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const target = new Date(iso)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function Field({ label, value, mono = false, copyable = false }: { label: string; value: string | number | null | undefined; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false)
  const isEmpty = value === null || value === undefined || value === ''

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(String(value))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }, [value])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0' }}>
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 13,
          textAlign: 'right',
          color: isEmpty ? '#cbd5e1' : '#1e293b',
          fontWeight: isEmpty ? 400 : 500,
          fontFamily: mono && !isEmpty ? 'var(--font-mono)' : undefined,
          letterSpacing: mono && !isEmpty ? '-0.02em' : undefined,
        }}>
          {isEmpty ? '\u2014' : value}
        </span>
        {copyable && !isEmpty && (
          <button
            onClick={handleCopy}
            style={{
              opacity: 1,
              color: copied ? '#059669' : '#94a3b8',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 4px' }}>
        <Icon size={14} style={{ color: '#94a3b8' }} />
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '0 16px 12px', borderTop: '1px solid #f1f5f9' }}>
        {children}
      </div>
    </div>
  )
}

export default function JobOrderDetailModal({
  row,
  onClose,
  allData,
  filtered,
  cartonLots,
  cartonNums,
  palletData,
}: Props) {
  if (!row) return null

  function getCartonRange(r: JobOrder): CartonRange | null {
    const parsed = parseLineDesc(r.OrderDtl_LineDesc || '')
    const qi = parseInt(parsed.qtyInner) || 0
    const qc = parseInt(parsed.qtyCarton) || 0
    if (!qi || !qc) return null
    const cartons = Math.floor(((r.OrderDtl_OrderQty || 0) * 1000) / (qi * qc))
    let prev = 0
    for (const f of filtered) {
      if (f.OrderHed_OrderNum !== r.OrderHed_OrderNum || f.OrderDtl_OrderLine >= r.OrderDtl_OrderLine) break
      const p = parseLineDesc(f.OrderDtl_LineDesc || '')
      const qi2 = parseInt(p.qtyInner) || 0
      const qc2 = parseInt(p.qtyCarton) || 0
      if (qi2 && qc2) prev += Math.floor(((f.OrderDtl_OrderQty || 0) * 1000) / (qi2 * qc2))
    }
    return { start: prev + 1, end: prev + cartons }
  }

  const pk = `${row.JobHead_JobNum}|${row.OrderDtl_PartNum}`
  const pData = palletData[pk]
  const sPallet = pData ? padNum(pData.startpallet, 6) : null
  const ePallet = pData ? padNum(pData.endpallet, 6) : null
  const cl = cartonLots[pk] ?? null
  const hasLot = !!cartonLots[pk]
  const c = getCartonRange(row)
  const lotNumber = formatLotNum(row.OrderHed_OrderNum, row.OrderDtl_OrderLine)
  const dueDays = daysUntil(row.OrderDtl_NeedByDate)
  const isSoon = dueDays !== null && dueDays >= 0 && dueDays <= 7

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
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ background: '#1e293b', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                Job order
              </span>
              {isSoon && (
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '2px 6px', borderRadius: 4 }}>
                  Due soon
                </span>
              )}
            </div>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, lineHeight: 1.3, margin: 0 }}>
              {row.OrderDtl_PartNum}
            </h2>

          </div>
          <button
            onClick={onClose}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sections */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <Section icon={ClipboardList} title="Order detail">
            <Field label="Order Num" value={row.OrderHed_OrderNum} mono copyable />
            <Field label="Order Line" value={row.OrderDtl_OrderLine} />
            <Field label="Qty" value={row.JobHead_ProdQty?.toLocaleString() ?? null} />
            <Field label="G / Ref" value={row.OrderHed_PONum} mono copyable />
          </Section>

          <Section icon={Factory} title="Production">
            <Field label="Job number" value={row.JobHead_JobNum} mono copyable />
            <Field label="Plant" value={row.JobHead_Plant} />
            <Field label="Order company" value={row.OrderHed_Company} />
            <Field label="Job company" value={row.JobHead_Company} />
          </Section>

          <Section icon={Package} title="Quantity detail">
            <Field label="Qty / inner" value={row.OrderDtl_FS_PcsPerBox_c} />
            <Field label="Qty / carton" value={row.OrderDtl_FS_BoxPerCarton_c} />
            <Field label="Container size" value={row.OrderDtl_FS_ContainerSize_c} />
            <Field label="Brand" value={row.OrderDtl_FS_Brand_c} />
            <Field label="AQL" value={row.OrderDtl_FS_AQLNew_c} />
          </Section>

          <Section icon={Layers} title="Lot & traceability">
            <Field label="Lot number" value={lotNumber} mono copyable />
            <Field label="Internal lot no" value={pData && sPallet && ePallet ? `${cl} ${sPallet} - ${cl} ${ePallet}` : null} mono />
            <Field label="Carton number" value={cartonNums?.[pk] ?? (c ? `${padNum(c.start)} - ${padNum(c.end)}` : null)} />
            <Field label="Carton lot" value={cl} />
            <Field label="Customer lot" value={row.OrderDtl_FS_LotNumber_c} />
          </Section>

          <Section icon={MapPin} title="Pallet">
            <Field label="Start pallet" value={sPallet} mono />
            <Field label="End pallet" value={ePallet} mono />
          </Section>

          <Section icon={Calendar} title="Dates">
            <Field label="Order date" value={row.OrderHed_OrderDate ? formatDateOrRaw(row.OrderHed_OrderDate) : null} />
            <Field label="Need by" value={row.OrderDtl_NeedByDate ? formatDateOrRaw(row.OrderDtl_NeedByDate) : null} />
          </Section>

          {/* Generate PDF */}
          {hasLot && (
            <Button
              variant="success"
              size="md"
              icon={FileText}
              onClick={() => generatePdf().then((fn) => fn(row, allData))}
              style={{ width: '100%', marginTop: 4 }}
            >
              Generate PDF
            </Button>
          )}
        </div>
      </div>
    </div>
    </Portal>
  )
}

export function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export function formatDateOrRaw(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw.slice(0, 10) : formatDate(d)
}

export function padNum(n: number, len = 5): string {
  return String(n).padStart(len, '0')
}

export function formatLotNum(orderNum: number, line: number): string {
  return `${String(orderNum).padStart(9, '0')}-${String(line).padStart(2, '0')}`
}

export function extractSizeFromPartNum(partNum: string): string {
  const parts = partNum.split('-')
  return parts.length >= 2 ? parts[parts.length - 2] : ''
}

export function extractBasePartGroup(partNum: string): string {
  const parts = partNum.split('-')
  return parts.length >= 3 ? parts.slice(0, -2).join('-') : ''
}

export function parseLineDesc(desc: string) {
  const parts = desc.split(',')
  return {
    descName: parts.slice(0, 3).join(','),
    qtyInner: parts[3] || '-',
    qtyCarton: parts[4] || '-',
  }
}

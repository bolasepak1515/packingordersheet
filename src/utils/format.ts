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

export function formatRelativeTime(raw: string): string {
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  const diffMs = Date.now() - d.getTime()
  const secs = Math.max(0, Math.floor(diffMs / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
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

import { describe, it, expect } from 'vitest'
import { formatDate, padNum, formatLotNum, extractSizeFromPartNum, extractBasePartGroup, parseLineDesc } from './format'

describe('formatDate', () => {
  it('formats date as DD/MM/YYYY', () => {
    expect(formatDate(new Date(2026, 6, 1))).toBe('01/07/2026')
  })
})

describe('padNum', () => {
  it('pads number to default length 5', () => {
    expect(padNum(42)).toBe('00042')
  })
  it('pads number to custom length', () => {
    expect(padNum(42, 3)).toBe('042')
  })
})

describe('formatLotNum', () => {
  it('formats order+line as padded lot number', () => {
    expect(formatLotNum(12345, 3)).toBe('000012345-03')
  })
})

describe('extractSizeFromPartNum', () => {
  it('extracts second-to-last segment', () => {
    expect(extractSizeFromPartNum('ABC-M-L-001')).toBe('L')
  })
  it('returns empty when too few segments', () => {
    expect(extractSizeFromPartNum('ABC')).toBe('')
  })
})

describe('extractBasePartGroup', () => {
  it('strips size and sequence segments', () => {
    expect(extractBasePartGroup('NURTE-TUR-2.2PFSN-FTCB-S-01')).toBe('NURTE-TUR-2.2PFSN-FTCB')
    expect(extractBasePartGroup('NURTE-TUR-2.2PFSN-FTCB-M-01')).toBe('NURTE-TUR-2.2PFSN-FTCB')
    expect(extractBasePartGroup('NURTE-TUR-2.2PFSN-FTCB-L-01')).toBe('NURTE-TUR-2.2PFSN-FTCB')
  })
  it('returns remaining segments when only three', () => {
    expect(extractBasePartGroup('ABC-L-01')).toBe('ABC')
  })
  it('returns empty when too few segments', () => {
    expect(extractBasePartGroup('ABC')).toBe('')
  })
})

describe('parseLineDesc', () => {
  it('parses comma-separated description', () => {
    const r = parseLineDesc('desc,foo,bar,12,24')
    expect(r.descName).toBe('desc,foo,bar')
    expect(r.qtyInner).toBe('12')
    expect(r.qtyCarton).toBe('24')
  })
  it('handles missing values', () => {
    const r = parseLineDesc('desc')
    expect(r.qtyInner).toBe('-')
    expect(r.qtyCarton).toBe('-')
  })
})

import { describe, it, expect } from 'vitest'
import { formatMoney } from '../formatMoney.js'

describe('formatMoney', () => {
  it('should format positive amounts with 2 decimals', () => {
    expect(formatMoney(123.456)).toBe('123.46 €')
    expect(formatMoney(100.00)).toBe('100.00 €')
  })

  it('should format zero correctly', () => {
    expect(formatMoney(0)).toBe('0.00 €')
  })

  it('should format negative amounts', () => {
    expect(formatMoney(-50.75)).toBe('-50.75 €')
  })

  it('should round to 2 decimal places', () => {
    expect(formatMoney(10.9999)).toBe('11.00 €')
    expect(formatMoney(10.1234)).toBe('10.12 €')
  })

  it('should handle very small amounts', () => {
    expect(formatMoney(0.01)).toBe('0.01 €')
    expect(formatMoney(0.001)).toBe('0.00 €')
  })

  it('should handle large amounts', () => {
    expect(formatMoney(1234567.89)).toBe('1234567.89 €')
  })
})

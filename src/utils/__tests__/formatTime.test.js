import { describe, it, expect } from 'vitest'
import { formatTime } from '../formatTime.js'

describe('formatTime', () => {
  it('should format time in hours and minutes', () => {
    expect(formatTime(90)).toBe('1h 30min')
    expect(formatTime(125)).toBe('2h 5min')
  })

  it('should format whole hours without minutes', () => {
    expect(formatTime(120)).toBe('2h 0min')
    expect(formatTime(60)).toBe('1h 0min')
  })

  it('should format minutes only if less than 60', () => {
    expect(formatTime(45)).toBe('45min')
    expect(formatTime(30)).toBe('30min')
    expect(formatTime(5)).toBe('5min')
  })

  it('should handle zero correctly', () => {
    expect(formatTime(0)).toBe('0min')
  })

  it('should round fractional minutes', () => {
    expect(formatTime(67.5)).toBe('1h 8min')
    expect(formatTime(59.7)).toBe('1h 0min') // 60 minutes = 1 hour
  })

  it('should handle large values', () => {
    expect(formatTime(240)).toBe('4h 0min')
    expect(formatTime(500)).toBe('8h 20min')
  })
})

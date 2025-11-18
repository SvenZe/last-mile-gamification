import { describe, it, expect } from 'vitest'
import {
  euclideanDistance,
  clamp,
  pointToSegmentDistance,
  minutesToHoursAndMinutes,
  percentageDifference,
  roundTo,
  lerp,
  inRange,
  average,
  sum
} from '../mathHelpers'

describe('mathHelpers', () => {
  describe('euclideanDistance', () => {
    it('should calculate distance between two points', () => {
      expect(euclideanDistance(0, 0, 3, 4)).toBe(5)
    })

    it('should return 0 for same point', () => {
      expect(euclideanDistance(5, 5, 5, 5)).toBe(0)
    })

    it('should work with negative coordinates', () => {
      expect(euclideanDistance(-1, -1, 2, 3)).toBeCloseTo(5, 5)
    })
  })

  describe('clamp', () => {
    it('should clamp value below min', () => {
      expect(clamp(5, 10, 20)).toBe(10)
    })

    it('should clamp value above max', () => {
      expect(clamp(25, 10, 20)).toBe(20)
    })

    it('should not clamp value in range', () => {
      expect(clamp(15, 10, 20)).toBe(15)
    })

    it('should work with negative numbers', () => {
      expect(clamp(-10, -5, 5)).toBe(-5)
    })
  })

  describe('pointToSegmentDistance', () => {
    it('should calculate perpendicular distance to segment', () => {
      // Point (0, 5) to horizontal segment from (0, 0) to (10, 0)
      expect(pointToSegmentDistance(0, 5, 0, 0, 10, 0)).toBe(5)
    })

    it('should calculate distance to segment endpoint', () => {
      // Point (15, 0) to segment from (0, 0) to (10, 0)
      expect(pointToSegmentDistance(15, 0, 0, 0, 10, 0)).toBe(5)
    })

    it('should handle zero-length segment', () => {
      expect(pointToSegmentDistance(5, 5, 0, 0, 0, 0)).toBeCloseTo(7.071, 2)
    })
  })

  describe('minutesToHoursAndMinutes', () => {
    it('should convert minutes to hours and minutes', () => {
      expect(minutesToHoursAndMinutes(90)).toEqual({ hours: 1, minutes: 30 })
    })

    it('should handle less than an hour', () => {
      expect(minutesToHoursAndMinutes(45)).toEqual({ hours: 0, minutes: 45 })
    })

    it('should handle exact hours', () => {
      expect(minutesToHoursAndMinutes(120)).toEqual({ hours: 2, minutes: 0 })
    })

    it('should round fractional minutes', () => {
      expect(minutesToHoursAndMinutes(90.7)).toEqual({ hours: 1, minutes: 31 })
    })
  })

  describe('percentageDifference', () => {
    it('should calculate percentage improvement', () => {
      expect(percentageDifference(80, 100)).toBe(20)
    })

    it('should calculate percentage worsening', () => {
      expect(percentageDifference(120, 100)).toBe(-20)
    })

    it('should handle zero baseline', () => {
      expect(percentageDifference(50, 0)).toBe(0)
    })

    it('should handle equal values', () => {
      expect(percentageDifference(100, 100)).toBe(0)
    })
  })

  describe('roundTo', () => {
    it('should round to specified decimal places', () => {
      expect(roundTo(3.14159, 2)).toBe(3.14)
    })

    it('should round to integer when decimals is 0', () => {
      expect(roundTo(3.7, 0)).toBe(4)
    })

    it('should handle negative numbers', () => {
      expect(roundTo(-2.456, 2)).toBe(-2.46)
    })
  })

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5)
    })

    it('should return start value at t=0', () => {
      expect(lerp(10, 20, 0)).toBe(10)
    })

    it('should return end value at t=1', () => {
      expect(lerp(10, 20, 1)).toBe(20)
    })

    it('should clamp t values outside 0-1 range', () => {
      expect(lerp(0, 10, 1.5)).toBe(10)
      expect(lerp(0, 10, -0.5)).toBe(0)
    })
  })

  describe('inRange', () => {
    it('should return true for value in range', () => {
      expect(inRange(5, 0, 10)).toBe(true)
    })

    it('should return true for value at boundaries', () => {
      expect(inRange(0, 0, 10)).toBe(true)
      expect(inRange(10, 0, 10)).toBe(true)
    })

    it('should return false for value below range', () => {
      expect(inRange(-1, 0, 10)).toBe(false)
    })

    it('should return false for value above range', () => {
      expect(inRange(11, 0, 10)).toBe(false)
    })
  })

  describe('average', () => {
    it('should calculate average of numbers', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3)
    })

    it('should handle empty array', () => {
      expect(average([])).toBe(0)
    })

    it('should handle single value', () => {
      expect(average([42])).toBe(42)
    })

    it('should handle negative numbers', () => {
      expect(average([-5, 0, 5])).toBe(0)
    })
  })

  describe('sum', () => {
    it('should calculate sum of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15)
    })

    it('should handle empty array', () => {
      expect(sum([])).toBe(0)
    })

    it('should handle negative numbers', () => {
      expect(sum([-10, 5, 5])).toBe(0)
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  randomTrafficVariation,
  randomDelayFactor,
  hasTrafficLight,
  createSeededRandom,
  randomIntensityVariation,
  generateBaseTraffic
} from '../trafficUtils'

describe('trafficUtils', () => {
  describe('randomTrafficVariation', () => {
    it('should return value within default range (0.9 - 1.15)', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomTrafficVariation()
        expect(value).toBeGreaterThanOrEqual(0.9)
        expect(value).toBeLessThanOrEqual(1.15)
      }
    })

    it('should return value within custom range', () => {
      for (let i = 0; i < 50; i++) {
        const value = randomTrafficVariation(0.5, 2.0)
        expect(value).toBeGreaterThanOrEqual(0.5)
        expect(value).toBeLessThanOrEqual(2.0)
      }
    })
  })

  describe('randomDelayFactor', () => {
    it('should return value within default range (0.8 - 1.2)', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomDelayFactor()
        expect(value).toBeGreaterThanOrEqual(0.8)
        expect(value).toBeLessThanOrEqual(1.2)
      }
    })

    it('should return value within custom range', () => {
      for (let i = 0; i < 50; i++) {
        const value = randomDelayFactor(1.0, 1.5)
        expect(value).toBeGreaterThanOrEqual(1.0)
        expect(value).toBeLessThanOrEqual(1.5)
      }
    })
  })

  describe('hasTrafficLight', () => {
    it('should return boolean', () => {
      const result = hasTrafficLight()
      expect(typeof result).toBe('boolean')
    })

    it('should have roughly correct probability (20%)', () => {
      let trueCount = 0
      const iterations = 1000
      
      for (let i = 0; i < iterations; i++) {
        if (hasTrafficLight(0.2)) trueCount++
      }
      
      const actualProbability = trueCount / iterations
      // Allow 5% margin of error
      expect(actualProbability).toBeGreaterThan(0.15)
      expect(actualProbability).toBeLessThan(0.25)
    })

    it('should respect custom probability', () => {
      let trueCount = 0
      const iterations = 1000
      
      for (let i = 0; i < iterations; i++) {
        if (hasTrafficLight(0.8)) trueCount++
      }
      
      const actualProbability = trueCount / iterations
      // 80% probability with 5% margin
      expect(actualProbability).toBeGreaterThan(0.75)
      expect(actualProbability).toBeLessThan(0.85)
    })
  })

  describe('createSeededRandom', () => {
    it('should return a function', () => {
      const random = createSeededRandom(12345)
      expect(typeof random).toBe('function')
    })

    it('should return values between 0 and 1', () => {
      const random = createSeededRandom(12345)
      for (let i = 0; i < 100; i++) {
        const value = random()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    })

    it('should return consistent sequence for same seed', () => {
      const random1 = createSeededRandom(999)
      const random2 = createSeededRandom(999)
      
      const sequence1 = Array.from({ length: 10 }, () => random1())
      const sequence2 = Array.from({ length: 10 }, () => random2())
      
      expect(sequence1).toEqual(sequence2)
    })

    it('should return different sequences for different seeds', () => {
      const random1 = createSeededRandom(111)
      const random2 = createSeededRandom(222)
      
      const sequence1 = Array.from({ length: 10 }, () => random1())
      const sequence2 = Array.from({ length: 10 }, () => random2())
      
      expect(sequence1).not.toEqual(sequence2)
    })
  })

  describe('randomIntensityVariation', () => {
    it('should return value within range (0.9 - 1.1)', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomIntensityVariation()
        expect(value).toBeGreaterThanOrEqual(0.9)
        expect(value).toBeLessThanOrEqual(1.1)
      }
    })
  })

  describe('generateBaseTraffic', () => {
    it('should generate higher traffic for main roads', () => {
      const mainRoadTraffic = []
      for (let i = 0; i < 50; i++) {
        mainRoadTraffic.push(generateBaseTraffic(true))
      }
      
      // Main roads: 35-70%
      mainRoadTraffic.forEach(traffic => {
        expect(traffic).toBeGreaterThanOrEqual(0.35)
        expect(traffic).toBeLessThanOrEqual(0.70)
      })
    })

    it('should generate lower traffic for side streets', () => {
      const sideStreetTraffic = []
      for (let i = 0; i < 50; i++) {
        sideStreetTraffic.push(generateBaseTraffic(false))
      }
      
      // Side streets: 15-40%
      sideStreetTraffic.forEach(traffic => {
        expect(traffic).toBeGreaterThanOrEqual(0.15)
        expect(traffic).toBeLessThanOrEqual(0.40)
      })
    })

    it('should generate higher average traffic for main roads than side streets', () => {
      const mainRoadAvg = []
      const sideStreetAvg = []
      
      for (let i = 0; i < 100; i++) {
        mainRoadAvg.push(generateBaseTraffic(true))
        sideStreetAvg.push(generateBaseTraffic(false))
      }
      
      const avgMain = mainRoadAvg.reduce((a, b) => a + b, 0) / mainRoadAvg.length
      const avgSide = sideStreetAvg.reduce((a, b) => a + b, 0) / sideStreetAvg.length
      
      expect(avgMain).toBeGreaterThan(avgSide)
    })
  })
})

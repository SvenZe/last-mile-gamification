import { describe, it, expect } from 'vitest'
import { 
  getTrafficIntensity, 
  getTrafficCategory, 
  getActualSpeed,
  generateTrafficModel
} from '../trafficModel.js'

describe('trafficModel', () => {
  describe('getTrafficIntensity', () => {
    const mockEdgeTraffic = {
      isMainRoad: true,
      baseTraffic: 0.5
    }

    it('should return higher intensity during rush hour (7-8 AM)', () => {
      const intensityAt7 = getTrafficIntensity(0, mockEdgeTraffic, false)
      const intensityAt8 = getTrafficIntensity(60, mockEdgeTraffic, false)
      
      // Traffic peaks around 8 AM
      expect(intensityAt8).toBeGreaterThanOrEqual(intensityAt7)
    })

    it('should decrease intensity after rush hour (9-10 AM)', () => {
      const intensityAt8 = getTrafficIntensity(60, mockEdgeTraffic, false)
      const intensityAt10 = getTrafficIntensity(180, mockEdgeTraffic, false)
      
      expect(intensityAt10).toBeLessThan(intensityAt8)
    })

    it('should return different values for simulation vs planning mode', () => {
      const planning = getTrafficIntensity(60, mockEdgeTraffic, false)
      const simulation = getTrafficIntensity(60, mockEdgeTraffic, true)
      
      // Simulation adds randomness, so values may differ slightly
      expect(Math.abs(planning - simulation)).toBeLessThan(0.2)
    })

    it('should stay within valid range [0, 1]', () => {
      const intensity = getTrafficIntensity(60, mockEdgeTraffic, false)
      expect(intensity).toBeGreaterThanOrEqual(0)
      expect(intensity).toBeLessThanOrEqual(1)
    })
  })

  describe('getTrafficCategory', () => {
    it('should return high for intensity >= 0.6', () => {
      expect(getTrafficCategory(0.6)).toBe('high')
      expect(getTrafficCategory(0.8)).toBe('high')
      expect(getTrafficCategory(1.0)).toBe('high')
    })

    it('should return medium for intensity >= 0.4 and < 0.6', () => {
      expect(getTrafficCategory(0.4)).toBe('medium')
      expect(getTrafficCategory(0.5)).toBe('medium')
    })

    it('should return low for intensity < 0.4', () => {
      expect(getTrafficCategory(0.0)).toBe('low')
      expect(getTrafficCategory(0.3)).toBe('low')
    })
  })

  describe('getActualSpeed', () => {
    it('should return 20 km/h for high traffic', () => {
      expect(getActualSpeed(0.7)).toBe(20)
    })

    it('should return 30 km/h for medium traffic', () => {
      expect(getActualSpeed(0.5)).toBe(30)
    })

    it('should return 40 km/h for low traffic', () => {
      expect(getActualSpeed(0.2)).toBe(40)
    })

    it('should handle boundary values correctly', () => {
      expect(getActualSpeed(0.6)).toBe(20) // >= 0.6
      expect(getActualSpeed(0.4)).toBe(30) // >= 0.4, < 0.6
    })
  })

  describe('generateTrafficModel', () => {
    const mockEdges = [
      { id: 'e1', lengthKm: 0.8 },
      { id: 'e2', lengthKm: 0.3 },
      { id: 'e3', lengthKm: 1.2 }
    ]

    it('should generate traffic data for all edges', () => {
      const model = generateTrafficModel(mockEdges)
      
      expect(model.edges['e1']).toBeDefined()
      expect(model.edges['e2']).toBeDefined()
      expect(model.edges['e3']).toBeDefined()
    })

    it('should assign baseTraffic values within valid range', () => {
      const model = generateTrafficModel(mockEdges)
      
      Object.values(model.edges).forEach(edgeData => {
        expect(edgeData.baseTraffic).toBeGreaterThanOrEqual(0.15)
        expect(edgeData.baseTraffic).toBeLessThanOrEqual(0.70)
      })
    })

    it('should classify roads as main or not main', () => {
      const model = generateTrafficModel(mockEdges)
      
      Object.values(model.edges).forEach(edgeData => {
        expect(typeof edgeData.isMainRoad).toBe('boolean')
      })
    })

    it('should use seed for consistent generation', () => {
      const model1 = generateTrafficModel(mockEdges, 12345)
      const model2 = generateTrafficModel(mockEdges, 12345)
      
      expect(model1.edges['e1'].baseTraffic).toBe(model2.edges['e1'].baseTraffic)
    })

    it('should generate different values with different seeds', () => {
      const model1 = generateTrafficModel(mockEdges, 12345)
      const model2 = generateTrafficModel(mockEdges, 67890)
      
      // Very unlikely (but not impossible) to be identical
      const different = model1.edges['e1'].baseTraffic !== model2.edges['e1'].baseTraffic ||
                       model1.edges['e2'].baseTraffic !== model2.edges['e2'].baseTraffic
      
      expect(different).toBe(true)
    })
  })
})

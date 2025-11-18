import { describe, it, expect } from 'vitest'
import { validateStopSequence, isRouteComplete, calculateTimeWindows } from '../RouteValidator.js'

describe('RouteValidator', () => {
  const mockNodesById = {
    'Depot': { id: 'Depot', x: 0, y: 0, type: 'depot' },
    'K01': { id: 'K01', x: 100, y: 0, type: 'address' },
    'K02': { id: 'K02', x: 200, y: 0, type: 'address' },
    'K03': { id: 'K03', x: 300, y: 0, type: 'address' }
  }

  const mockVehicle = {
    id: 'diesel',
    maxBoxes: 200,
    rangeKm: 50
  }

  describe('validateStopSequence', () => {
    it('should validate a reasonable route', () => {
      const stopSequence = ['K01', 'K02', 'K03']
      const edges = [
        { id: 'e1', a: 'Depot', b: 'K01', lengthKm: 1.0 },
        { id: 'e2', a: 'K01', b: 'K02', lengthKm: 1.0 },
        { id: 'e3', a: 'K02', b: 'K03', lengthKm: 1.0 },
        { id: 'e4', a: 'K03', b: 'Depot', lengthKm: 3.0 }
      ]

      const result = validateStopSequence(stopSequence, edges, mockVehicle, mockNodesById)

      expect(result.valid).toBe(true)
      expect(result.messages.length).toBeGreaterThanOrEqual(0)
      expect(result.totalKm).toBeGreaterThan(0)
    })

    it('should reject route exceeding time window', () => {
      const stopSequence = Array.from({ length: 50 }, (_, i) => `K${i}`)
      const edges = Array.from({ length: 51 }, (_, i) => ({
        id: `e${i}`,
        a: i === 0 ? 'Depot' : `K${i - 1}`,
        b: i === 50 ? 'Depot' : `K${i}`,
        lengthKm: 5.0
      }))

      const result = validateStopSequence(stopSequence, edges, mockVehicle, mockNodesById)

      expect(result.valid).toBe(false)
      expect(result.messages.some(m => m.includes('too long'))).toBe(true)
    })

    it('should calculate correct total distance', () => {
      const stopSequence = ['K01', 'K02']
      const edges = [
        { id: 'e1', a: 'Depot', b: 'K01', lengthKm: 2.5 },
        { id: 'e2', a: 'K01', b: 'K02', lengthKm: 3.0 },
        { id: 'e3', a: 'K02', b: 'Depot', lengthKm: 1.5 }
      ]

      const result = validateStopSequence(stopSequence, edges, mockVehicle, mockNodesById)

      expect(result.totalKm).toBe(7.0)
    })
  })

  describe('isRouteComplete', () => {
    it('should return true when all addresses visited and at depot', () => {
      const visited = new Set(['K01', 'K02', 'K03', 'K04', 'K05', 'K06',
                              'K07', 'K08', 'K09', 'K10', 'K11', 'K12',
                              'K13', 'K14', 'K15', 'K16', 'K17', 'K18'])
      const currentNode = 'Depot'
      const depotId = 'Depot'

      expect(isRouteComplete(visited, currentNode, depotId, 18)).toBe(true)
    })

    it('should return false when not all addresses visited', () => {
      const visited = new Set(['K01', 'K02', 'K03'])
      const currentNode = 'Depot'
      const depotId = 'Depot'

      expect(isRouteComplete(visited, currentNode, depotId, 18)).toBe(false)
    })

    it('should return false when not at depot', () => {
      const visited = new Set(['K01', 'K02', 'K03', 'K04', 'K05', 'K06',
                              'K07', 'K08', 'K09', 'K10', 'K11', 'K12',
                              'K13', 'K14', 'K15', 'K16', 'K17', 'K18'])
      const currentNode = 'K18'
      const depotId = 'Depot'

      expect(isRouteComplete(visited, currentNode, depotId, 18)).toBe(false)
    })

    it('should return true when currentNode is null (special case)', () => {
      const visited = new Set(['K01', 'K02', 'K03', 'K04', 'K05', 'K06',
                              'K07', 'K08', 'K09', 'K10', 'K11', 'K12',
                              'K13', 'K14', 'K15', 'K16', 'K17', 'K18'])
      const currentNode = null
      const depotId = 'Depot'

      expect(isRouteComplete(visited, currentNode, depotId, 18)).toBe(true)
    })
  })

  describe('calculateTimeWindows', () => {
    it('should distribute stops evenly across 3-hour window', () => {
      const stopSequence = ['K01', 'K02', 'K03', 'K04', 'K05', 'K06',
                           'K07', 'K08', 'K09', 'K10', 'K11', 'K12',
                           'K13', 'K14', 'K15', 'K16', 'K17', 'K18']

      const windows = calculateTimeWindows(stopSequence)

      expect(windows).toHaveLength(18)

      // First 6 stops: 7-8 AM
      expect(windows[0].windowStart).toBe(7)
      expect(windows[0].windowEnd).toBe(8)
      expect(windows[5].windowStart).toBe(7)
      expect(windows[5].windowEnd).toBe(8)

      // Next 6 stops: 8-9 AM
      expect(windows[6].windowStart).toBe(8)
      expect(windows[6].windowEnd).toBe(9)
      expect(windows[11].windowStart).toBe(8)
      expect(windows[11].windowEnd).toBe(9)

      // Last 6 stops: 9-10 AM
      expect(windows[12].windowStart).toBe(9)
      expect(windows[12].windowEnd).toBe(10)
      expect(windows[17].windowStart).toBe(9)
      expect(windows[17].windowEnd).toBe(10)
    })

    it('should include stop ID and display format', () => {
      const stopSequence = ['K01', 'K02']

      const windows = calculateTimeWindows(stopSequence)

      expect(windows[0].id).toBe('K01')
      expect(windows[0].windowDisplay).toBe('7-8 Uhr')
      expect(windows[1].id).toBe('K02')
      expect(windows[1].windowDisplay).toBe('7-8 Uhr')
    })

    it('should handle empty sequence', () => {
      const windows = calculateTimeWindows([])

      expect(windows).toHaveLength(0)
    })
  })
})

import { describe, it, expect } from 'vitest'
import { validateEdgeSelection, reconstructRouteAfterUndo } from '../ManualRouteHandler.js'

describe('ManualRouteHandler', () => {
  const mockNodesById = {
    'Depot': { id: 'Depot', x: 0, y: 0, type: 'depot' },
    'K01': { id: 'K01', x: 100, y: 0, type: 'address' },
    'K02': { id: 'K02', x: 200, y: 0, type: 'address' },
    'J1': { id: 'J1', x: 150, y: 50, type: 'junction' }
  }

  const startAnchorIds = ['Depot']

  describe('validateEdgeSelection', () => {
    it('should validate first edge starting at depot', () => {
      const edge = { id: 'e1', a: 'Depot', b: 'K01' }
      const state = {
        manualEdges: [],
        currentEndNode: null,
        startAnchorIds
      }

      const result = validateEdgeSelection(edge, state, mockNodesById)

      expect(result.valid).toBe(true)
      expect(result.anchorId).toBe('Depot')
      expect(result.newEndNode).toBe('K01')
    })

    it('should reject first edge not starting at depot', () => {
      const edge = { id: 'e1', a: 'K01', b: 'K02' }
      const state = {
        manualEdges: [],
        currentEndNode: null,
        startAnchorIds
      }

      const result = validateEdgeSelection(edge, state, mockNodesById)

      expect(result.valid).toBe(false)
      expect(result.message).toContain('depot')
    })

    it('should validate edge connecting to current position', () => {
      const edge = { id: 'e2', a: 'K01', b: 'K02' }
      const firstEdge = { id: 'e1', a: 'Depot', b: 'K01' }
      const state = {
        manualEdges: [firstEdge],
        currentEndNode: 'K01',
        startAnchorIds
      }

      const result = validateEdgeSelection(edge, state, mockNodesById)

      expect(result.valid).toBe(true)
      expect(result.anchorId).toBe('K01')
      expect(result.newEndNode).toBe('K02')
    })

    it('should reject edge not connecting to current position', () => {
      const edge = { id: 'e3', a: 'K02', b: 'J1' }
      const firstEdge = { id: 'e1', a: 'Depot', b: 'K01' }
      const state = {
        manualEdges: [firstEdge],
        currentEndNode: 'K01',
        startAnchorIds
      }

      const result = validateEdgeSelection(edge, state, mockNodesById)

      expect(result.valid).toBe(false)
      expect(result.message).toContain("doesn't connect")
    })
  })

  describe('reconstructRouteAfterUndo', () => {
    it('should return empty state for empty route', () => {
      const result = reconstructRouteAfterUndo([], startAnchorIds, mockNodesById)

      expect(result.visited.size).toBe(0)
      expect(result.currentNode).toBe(null)
    })

    it('should reconstruct state after single edge', () => {
      const edges = [
        { id: 'e1', a: 'Depot', b: 'K01' }
      ]

      const result = reconstructRouteAfterUndo(edges, startAnchorIds, mockNodesById)

      expect(result.visited.has('K01')).toBe(true)
      expect(result.currentNode).toBe('K01')
    })

    it('should reconstruct state after multiple edges', () => {
      const edges = [
        { id: 'e1', a: 'Depot', b: 'K01' },
        { id: 'e2', a: 'K01', b: 'K02' }
      ]

      const result = reconstructRouteAfterUndo(edges, startAnchorIds, mockNodesById)

      expect(result.visited.has('K01')).toBe(true)
      expect(result.visited.has('K02')).toBe(true)
      expect(result.currentNode).toBe('K02')
    })

    it('should handle junctions without marking them as visited', () => {
      const edges = [
        { id: 'e1', a: 'Depot', b: 'J1' },
        { id: 'e2', a: 'J1', b: 'K01' }
      ]

      const result = reconstructRouteAfterUndo(edges, startAnchorIds, mockNodesById)

      expect(result.visited.has('J1')).toBe(false)
      expect(result.visited.has('K01')).toBe(true)
      expect(result.currentNode).toBe('K01')
    })
  })
})

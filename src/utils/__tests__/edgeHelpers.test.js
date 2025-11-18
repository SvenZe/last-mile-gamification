import { describe, it, expect } from 'vitest'
import {
  getEdgeLength,
  calculateRouteDistance,
  removeDuplicateEdges,
  edgeConnectsToNode,
  getOtherEnd,
  findConnectedEdges,
  buildEdgeLookup
} from '../edgeHelpers.js'

describe('edgeHelpers', () => {
  const mockNodesById = {
    'A': { id: 'A', x: 0, y: 0 },
    'B': { id: 'B', x: 100, y: 0 },
    'C': { id: 'C', x: 100, y: 100 }
  }

  describe('getEdgeLength', () => {
    it('should return pre-calculated length if available', () => {
      const edge = { id: 'e1', a: 'A', b: 'B', lengthKm: 5.5 }
      expect(getEdgeLength(edge, mockNodesById)).toBe(5.5)
    })

    it('should calculate length from coordinates if not pre-calculated', () => {
      const edge = { id: 'e1', a: 'A', b: 'B' }
      const length = getEdgeLength(edge, mockNodesById)
      expect(length).toBeCloseTo(0.909, 2)
    })

    it('should return 0 for invalid nodes', () => {
      const edge = { id: 'e1', a: 'X', b: 'Y' }
      expect(getEdgeLength(edge, mockNodesById)).toBe(0)
    })
  })

  describe('calculateRouteDistance', () => {
    it('should sum all edge lengths', () => {
      const edges = [
        { id: 'e1', a: 'A', b: 'B', lengthKm: 2.0 },
        { id: 'e2', a: 'B', b: 'C', lengthKm: 3.5 }
      ]
      expect(calculateRouteDistance(edges, mockNodesById)).toBe(5.5)
    })

    it('should return 0 for empty route', () => {
      expect(calculateRouteDistance([], mockNodesById)).toBe(0)
    })
  })

  describe('removeDuplicateEdges', () => {
    it('should remove duplicate edge IDs', () => {
      const edges = [
        { id: 'e1', a: 'A', b: 'B' },
        { id: 'e2', a: 'B', b: 'C' },
        { id: 'e1', a: 'A', b: 'B' }
      ]
      const unique = removeDuplicateEdges(edges)
      expect(unique).toHaveLength(2)
      expect(unique[0].id).toBe('e1')
      expect(unique[1].id).toBe('e2')
    })

    it('should keep original order', () => {
      const edges = [
        { id: 'e2', a: 'B', b: 'C' },
        { id: 'e1', a: 'A', b: 'B' },
        { id: 'e2', a: 'B', b: 'C' }
      ]
      const unique = removeDuplicateEdges(edges)
      expect(unique[0].id).toBe('e2')
      expect(unique[1].id).toBe('e1')
    })
  })

  describe('edgeConnectsToNode', () => {
    it('should return true if edge connects to node (endpoint a)', () => {
      const edge = { id: 'e1', a: 'A', b: 'B' }
      expect(edgeConnectsToNode(edge, 'A')).toBe(true)
    })

    it('should return true if edge connects to node (endpoint b)', () => {
      const edge = { id: 'e1', a: 'A', b: 'B' }
      expect(edgeConnectsToNode(edge, 'B')).toBe(true)
    })

    it('should return false if edge does not connect to node', () => {
      const edge = { id: 'e1', a: 'A', b: 'B' }
      expect(edgeConnectsToNode(edge, 'C')).toBe(false)
    })
  })

  describe('getOtherEnd', () => {
    const edge = { id: 'e1', a: 'A', b: 'B' }

    it('should return b when given a', () => {
      expect(getOtherEnd(edge, 'A')).toBe('B')
    })

    it('should return a when given b', () => {
      expect(getOtherEnd(edge, 'B')).toBe('A')
    })

    it('should return null for unconnected node', () => {
      expect(getOtherEnd(edge, 'C')).toBe(null)
    })
  })

  describe('findConnectedEdges', () => {
    const edges = [
      { id: 'e1', a: 'A', b: 'B' },
      { id: 'e2', a: 'B', b: 'C' },
      { id: 'e3', a: 'C', b: 'A' }
    ]

    it('should find all edges connected to node', () => {
      const connected = findConnectedEdges(edges, 'A')
      expect(connected).toHaveLength(2)
      expect(connected.map(e => e.id)).toContain('e1')
      expect(connected.map(e => e.id)).toContain('e3')
    })

    it('should return empty array for node with no connections', () => {
      const connected = findConnectedEdges(edges, 'D')
      expect(connected).toHaveLength(0)
    })
  })

  describe('buildEdgeLookup', () => {
    it('should create lookup by edge ID', () => {
      const edges = [
        { id: 'e1', a: 'A', b: 'B' },
        { id: 'e2', a: 'B', b: 'C' }
      ]
      const lookup = buildEdgeLookup(edges)
      expect(lookup['e1']).toEqual({ id: 'e1', a: 'A', b: 'B' })
      expect(lookup['e2']).toEqual({ id: 'e2', a: 'B', b: 'C' })
    })

    it('should return empty object for empty array', () => {
      const lookup = buildEdgeLookup([])
      expect(lookup).toEqual({})
    })
  })
})

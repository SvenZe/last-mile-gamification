import { describe, it, expect } from 'vitest'
import {
  buildNodeLookup,
  findDepotNode,
  buildCoincidentNodesMap,
  getCoincidentNodes,
  isDeliveryAddress,
  getDeliveryAddresses
} from '../nodeHelpers.js'

describe('nodeHelpers', () => {
  const mockNodes = [
    { id: 'Depot', x: 100, y: 100, type: 'depot' },
    { id: 'K01', x: 200, y: 200, type: 'address', name: 'K01' },
    { id: 'K02', x: 100, y: 100, type: 'address', name: 'K02' }, // Same position as Depot
    { id: 'J1', x: 300, y: 300, type: 'junction' }
  ]

  describe('buildNodeLookup', () => {
    it('should create lookup by node ID', () => {
      const lookup = buildNodeLookup(mockNodes)
      expect(lookup['Depot']).toEqual(mockNodes[0])
      expect(lookup['K01']).toEqual(mockNodes[1])
    })

    it('should return empty object for empty array', () => {
      const lookup = buildNodeLookup([])
      expect(lookup).toEqual({})
    })
  })

  describe('findDepotNode', () => {
    it('should find depot node', () => {
      const depot = findDepotNode(mockNodes)
      expect(depot).toEqual(mockNodes[0])
      expect(depot.type).toBe('depot')
    })

    it('should return null if no depot exists', () => {
      const nodesWithoutDepot = mockNodes.filter(n => n.type !== 'depot')
      const depot = findDepotNode(nodesWithoutDepot)
      expect(depot).toBe(null)
    })
  })

  describe('buildCoincidentNodesMap', () => {
    it('should group nodes at same position', () => {
      const map = buildCoincidentNodesMap(mockNodes)
      
      // Depot and K02 share same position
      expect(map['Depot']).toContain('Depot')
      expect(map['Depot']).toContain('K02')
      expect(map['K02']).toContain('Depot')
      expect(map['K02']).toContain('K02')
      
      // K01 is alone
      expect(map['K01']).toEqual(['K01'])
    })

    it('should handle single nodes at each position', () => {
      const separateNodes = [
        { id: 'A', x: 100, y: 100, type: 'address' },
        { id: 'B', x: 200, y: 200, type: 'address' }
      ]
      const map = buildCoincidentNodesMap(separateNodes)
      expect(map['A']).toEqual(['A'])
      expect(map['B']).toEqual(['B'])
    })
  })

  describe('getCoincidentNodes', () => {
    it('should return coincident nodes for node in cluster', () => {
      const map = buildCoincidentNodesMap(mockNodes)
      const cluster = getCoincidentNodes('Depot', map)
      expect(cluster).toHaveLength(2)
      expect(cluster).toContain('Depot')
      expect(cluster).toContain('K02')
    })

    it('should return array with just the node if no coincident nodes', () => {
      const map = buildCoincidentNodesMap(mockNodes)
      const cluster = getCoincidentNodes('K01', map)
      expect(cluster).toEqual(['K01'])
    })

    it('should return array with node ID if not in map', () => {
      const map = buildCoincidentNodesMap(mockNodes)
      const cluster = getCoincidentNodes('Unknown', map)
      expect(cluster).toEqual(['Unknown'])
    })
  })

  describe('isDeliveryAddress', () => {
    it('should return true for address nodes', () => {
      expect(isDeliveryAddress(mockNodes[1])).toBe(true) // K01
      expect(isDeliveryAddress(mockNodes[2])).toBe(true) // K02
    })

    it('should return false for depot', () => {
      expect(isDeliveryAddress(mockNodes[0])).toBe(false)
    })

    it('should return false for junction', () => {
      expect(isDeliveryAddress(mockNodes[3])).toBe(false)
    })

    it('should identify nodes starting with K as addresses', () => {
      const node = { id: 'K99', name: 'K99', type: 'other' }
      expect(isDeliveryAddress(node)).toBe(true)
    })
  })

  describe('getDeliveryAddresses', () => {
    it('should return only delivery addresses', () => {
      const addresses = getDeliveryAddresses(mockNodes)
      expect(addresses).toHaveLength(2)
      expect(addresses.map(n => n.id)).toContain('K01')
      expect(addresses.map(n => n.id)).toContain('K02')
    })

    it('should return empty array if no addresses', () => {
      const noAddresses = mockNodes.filter(n => n.type !== 'address')
      const addresses = getDeliveryAddresses(noAddresses)
      expect(addresses).toHaveLength(0)
    })
  })
})

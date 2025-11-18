import { describe, it, expect } from 'vitest'
import { calculateDistance } from '../distance.js'

describe('calculateDistance', () => {
  it('should calculate Euclidean distance between two nodes', () => {
    const nodeA = { id: 'A', x: 0, y: 0 }
    const nodeB = { id: 'B', x: 300, y: 400 }
    
    // Distance = sqrt(300^2 + 400^2) = 500 pixels
    // In km: 500 / 110 = 4.545 km
    expect(calculateDistance(nodeA, nodeB)).toBeCloseTo(4.545, 2)
  })

  it('should return 0 for same node', () => {
    const node = { id: 'A', x: 100, y: 100 }
    expect(calculateDistance(node, node)).toBe(0)
  })

  it('should handle horizontal distance', () => {
    const nodeA = { id: 'A', x: 0, y: 100 }
    const nodeB = { id: 'B', x: 500, y: 100 }
    
    // 500 pixels = 500/110 = 4.545 km
    expect(calculateDistance(nodeA, nodeB)).toBeCloseTo(4.545, 2)
  })

  it('should handle vertical distance', () => {
    const nodeA = { id: 'A', x: 100, y: 0 }
    const nodeB = { id: 'B', x: 100, y: 300 }
    
    // 300 pixels = 300/110 = 2.727 km
    expect(calculateDistance(nodeA, nodeB)).toBeCloseTo(2.727, 2)
  })

  it('should handle diagonal distance (45 degrees)', () => {
    const nodeA = { id: 'A', x: 0, y: 0 }
    const nodeB = { id: 'B', x: 100, y: 100 }
    
    // Distance = sqrt(100^2 + 100^2) = 141.42 pixels / 110 = 1.286 km
    expect(calculateDistance(nodeA, nodeB)).toBeCloseTo(1.286, 2)
  })

  it('should be commutative (distance A->B = distance B->A)', () => {
    const nodeA = { id: 'A', x: 50, y: 75 }
    const nodeB = { id: 'B', x: 200, y: 300 }
    
    expect(calculateDistance(nodeA, nodeB)).toBeCloseTo(calculateDistance(nodeB, nodeA), 10)
  })

  it('should handle negative coordinates', () => {
    const nodeA = { id: 'A', x: -100, y: -100 }
    const nodeB = { id: 'B', x: 100, y: 100 }
    
    // Distance = sqrt(200^2 + 200^2) = 282.84 pixels / 110 = 2.571 km
    expect(calculateDistance(nodeA, nodeB)).toBeCloseTo(2.571, 2)
  })
})

/**
 * networkDistance.js
 * 
 * Calculates actual driving distances through the road network using Dijkstra.
 * This is way more accurate than straight-line distance, especially in cities
 * with one-way streets and construction zones.
 */

import tourSetup from '../data/tourSetup.json'
import { findDetour } from './pathfinding.js'

const distanceCache = new Map()

const nodesById = {}
tourSetup.nodes.forEach(n => { nodesById[n.id] = n })

const edgesByNode = new Map()
tourSetup.edges.forEach(edge => {
  if (!edgesByNode.has(edge.a)) edgesByNode.set(edge.a, [])
  if (!edgesByNode.has(edge.b)) edgesByNode.set(edge.b, [])
  edgesByNode.get(edge.a).push(edge)
  edgesByNode.get(edge.b).push(edge)
})

function getCluster(nodeId) {
  const node = nodesById[nodeId]
  if (!node) return [nodeId]
  
  return tourSetup.nodes
    .filter(n => n.x === node.x && n.y === node.y)
    .map(n => n.id)
}

// Run Dijkstra to find shortest path through the road network.
// Much more accurate than straight-line distance.
export function calculateNetworkDistance(fromId, toId) {
  // Check cache first
  const cacheKey1 = `${fromId}-${toId}`
  const cacheKey2 = `${toId}-${fromId}`
  
  if (distanceCache.has(cacheKey1)) {
    return distanceCache.get(cacheKey1)
  }
  if (distanceCache.has(cacheKey2)) {
    return distanceCache.get(cacheKey2)
  }
  
  // Get clusters for both nodes
  const fromCluster = getCluster(fromId)
  const toCluster = getCluster(toId)
  
  // Try to find direct edge first
  for (const fromNode of fromCluster) {
    for (const toNode of toCluster) {
      const directEdge = tourSetup.edges.find(e =>
        (e.a === fromNode && e.b === toNode) ||
        (e.b === fromNode && e.a === toNode)
      )
      
      if (directEdge && !directEdge.blocked) {
        const distance = directEdge.lengthKm || 0
        distanceCache.set(cacheKey1, distance)
        distanceCache.set(cacheKey2, distance)
        return distance
      }
    }
  }
  
  // No direct edge - use pathfinding
  // Use junction nodes for pathfinding (not address/depot nodes)
  const fromJunction = fromCluster.find(id => nodesById[id]?.type === 'junction') || fromCluster[0]
  const toJunction = toCluster.find(id => nodesById[id]?.type === 'junction') || toCluster[0]
  
  const path = findDetour(fromJunction, toJunction, new Set())
  
  if (path && path.length > 0) {
    const distance = path.reduce((sum, edge) => sum + (edge.lengthKm || 0), 0)
    distanceCache.set(cacheKey1, distance)
    distanceCache.set(cacheKey2, distance)
    return distance
  }
  
  // Fallback: euclidean distance if no path found
  const fromNode = nodesById[fromId]
  const toNode = nodesById[toId]
  if (fromNode && toNode) {
    const euclidean = euclideanDistance(fromNode.x, fromNode.y, toNode.x, toNode.y) / tourSetup.canvas.scalePxPerKm
    distanceCache.set(cacheKey1, euclidean)
    distanceCache.set(cacheKey2, euclidean)
    return euclidean
  }
  
  return Infinity
}

/**
 * Clear the distance cache (useful for testing)
 */
export function clearDistanceCache() {
  distanceCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: distanceCache.size,
    entries: distanceCache.size
  }
}

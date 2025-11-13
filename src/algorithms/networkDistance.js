import tourSetup from '../data/tourSetup.json'
import { findDetour } from './pathfinding.js'

/**
 * Calculate actual network distance between two nodes using the street network.
 * 
 * This is critical for route optimization! Euclidean distance can be very
 * misleading - two addresses that are close "as the crow flies" might require
 * a long detour through the street network.
 * 
 * The optimizer should minimize the ACTUAL driving distance, not air distance.
 */

// Cache for network distances to avoid recomputing
const distanceCache = new Map()

// Build lookup tables
const nodesById = {}
tourSetup.nodes.forEach(n => { nodesById[n.id] = n })

const edgesByNode = new Map()
tourSetup.edges.forEach(edge => {
  if (!edgesByNode.has(edge.a)) edgesByNode.set(edge.a, [])
  if (!edgesByNode.has(edge.b)) edgesByNode.set(edge.b, [])
  edgesByNode.get(edge.a).push(edge)
  edgesByNode.get(edge.b).push(edge)
})

/**
 * Get cluster of coincident nodes (nodes at same coordinates)
 */
function getCluster(nodeId) {
  const node = nodesById[nodeId]
  if (!node) return [nodeId]
  
  return tourSetup.nodes
    .filter(n => n.x === node.x && n.y === node.y)
    .map(n => n.id)
}

/**
 * Calculate actual driving distance between two nodes through the road network.
 * This uses Dijkstra's algorithm to find the shortest path, respecting blocked
 * roads and junction routing. Results are cached to speed up repeated lookups.
 * 
 * @param {string} fromId - Start node
 * @param {string} toId - End node  
 * @returns {number} Distance in km, or Infinity if unreachable
 */
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
    const euclidean = Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y) / tourSetup.canvas.scalePxPerKm
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

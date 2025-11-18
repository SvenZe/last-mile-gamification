/**
 * edgeHelpers.js
 * Utilities for working with edges (road segments).
 */

import { calculateDistance } from '../algorithms/distance.js'

export function getEdgeLength(edge, nodesById) {
  if (edge.lengthKm !== undefined && edge.lengthKm !== null) {
    return edge.lengthKm
  }
  
  const nodeA = nodesById[edge.a]
  const nodeB = nodesById[edge.b]
  
  if (!nodeA || !nodeB) {
    return 0
  }
  
  return calculateDistance(nodeA, nodeB)
}

export function calculateRouteDistance(edges, nodesById) {
  return edges.reduce((total, edge) => {
    return total + getEdgeLength(edge, nodesById)
  }, 0)
}

/**
 * Remove duplicate edges from a route.
 * Keeps only the first occurrence of each edge ID.
 * 
 * @param {Edge[]} edges - Array of edges (may contain duplicates)
 * @returns {Edge[]} Array of unique edges
 * 
 * @example
 * const uniqueEdges = removeDuplicateEdges(route)
 */
export function removeDuplicateEdges(edges) {
  const seenIds = new Set()
  const uniqueEdges = []
  
  edges.forEach(edge => {
    if (!seenIds.has(edge.id)) {
      seenIds.add(edge.id)
      uniqueEdges.push(edge)
    }
  })
  
  return uniqueEdges
}

/**
 * Check if an edge connects to a specific node.
 * 
 * @param {Edge} edge - Edge to check
 * @param {string} nodeId - Node ID to check for
 * @returns {boolean} True if edge connects to the node
 */
export function edgeConnectsToNode(edge, nodeId) {
  return edge.a === nodeId || edge.b === nodeId
}

/**
 * Get the other end of an edge given one node.
 * 
 * @param {Edge} edge - Edge object
 * @param {string} fromNodeId - Known node ID
 * @returns {string|null} ID of the other node, or null if edge doesn't connect to fromNodeId
 * 
 * @example
 * const nextNode = getOtherEnd(edge, currentNode)
 */
export function getOtherEnd(edge, fromNodeId) {
  if (edge.a === fromNodeId) return edge.b
  if (edge.b === fromNodeId) return edge.a
  return null
}

/**
 * Find all edges that connect to a specific node.
 * 
 * @param {Edge[]} edges - Array of all edges
 * @param {string} nodeId - Node ID to find connections for
 * @returns {Edge[]} Array of edges connected to the node
 */
export function findConnectedEdges(edges, nodeId) {
  return edges.filter(edge => edgeConnectsToNode(edge, nodeId))
}

/**
 * Build an edge lookup by edge ID.
 * 
 * @param {Edge[]} edges - Array of edges
 * @returns {Object} Lookup object where keys are edge IDs
 */
export function buildEdgeLookup(edges) {
  return edges.reduce((acc, edge) => {
    acc[edge.id] = edge
    return acc
  }, {})
}

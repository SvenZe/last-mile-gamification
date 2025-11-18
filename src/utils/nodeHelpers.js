/**
 * nodeHelpers.js
 * Utilities for working with nodes (depot, addresses, junctions).
 */

// Convert node array to lookup object (node.id -> node)
export function buildNodeLookup(nodes) {
  return nodes.reduce((acc, node) => {
    acc[node.id] = node
    return acc
  }, {})
}

export function findDepotNode(nodes) {
  return nodes.find(n => n.type === 'depot') || null
}

// Some nodes sit at the same x,y position (e.g. depot + address).
// This builds a map showing which nodes are coincident.
export function buildCoincidentNodesMap(nodes) {
  const positionGroups = new Map()
  nodes.forEach(node => {
    const key = `${node.x}:${node.y}`
    if (!positionGroups.has(key)) {
      positionGroups.set(key, [])
    }
    positionGroups.get(key).push(node.id)
  })
  
  // Map each node to its group
  const coincidentNodeIds = {}
  positionGroups.forEach(group => {
    group.forEach(nodeId => {
      coincidentNodeIds[nodeId] = group
    })
  })
  
  return coincidentNodeIds
}

/**
 * Get all nodes at the same position as the given node.
 * 
 * @param {string} nodeId - ID of the reference node
 * @param {Object} coincidentMap - Map from buildCoincidentNodesMap
 * @returns {string[]} Array of coincident node IDs
 */
export function getCoincidentNodes(nodeId, coincidentMap) {
  return coincidentMap[nodeId] || [nodeId]
}

/**
 * Check if a node is a delivery address (not depot, not junction).
 * 
 * @param {Node} node - Node to check
 * @returns {boolean} True if node is a delivery address
 */
export function isDeliveryAddress(node) {
  if (!node) return false
  return node.type === 'address' || (node.name && node.name.startsWith('K')) || false
}

/**
 * Get all delivery address nodes from a network.
 * 
 * @param {Node[]} nodes - Array of all nodes
 * @returns {Node[]} Array of delivery address nodes only
 */
export function getDeliveryAddresses(nodes) {
  return nodes.filter(isDeliveryAddress)
}

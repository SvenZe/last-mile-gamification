/**
 * ManualRouteHandler.js
 * Handles manual route building: edge selection, address tracking, validation.
 */

// Get all nodes at the same x,y position
export function getCluster(nodeId, nodesById) {
  const node = nodesById[nodeId]
  if (!node) return [nodeId]
  
  const cluster = []
  Object.values(nodesById).forEach(n => {
    if (n.x === node.x && n.y === node.y) {
      cluster.push(n.id)
    }
  })
  return cluster
}

// Prefer junctions over addresses when picking from a cluster
export function pickPrimaryNode(cluster, nodesById) {
  const junctionCandidate = cluster.find(id => nodesById[id]?.type === 'junction')
  if (junctionCandidate) return junctionCandidate
  return cluster[0]
}

export function collectVisitedAddresses(cluster, nodesById, targetSet) {
  cluster.forEach(id => {
    if (nodesById[id]?.type === 'address') {
      targetSet.add(id)
    }
  })
}

export function validateEdgeSelection(edge, state, nodesById) {
  const { manualEdges, currentEndNode, startAnchorIds } = state
  
  if (manualEdges.length === 0) {
    const touchesStart = startAnchorIds.includes(edge.a) || startAnchorIds.includes(edge.b)
    if (!touchesStart) {
      return {
        valid: false,
        message: 'First edge must start at depot (depot shares coordinates with K02)',
        anchorId: null,
        newEndNode: null
      }
    }
    
    const startId = startAnchorIds.includes(edge.a) ? edge.a : edge.b
    const targetId = edge.a === startId ? edge.b : edge.a
    
    return {
      valid: true,
      message: null,
      anchorId: startId,
      newEndNode: targetId
    }
  }
  
  // Subsequent edges must connect to current position
  const currentCluster = getCluster(currentEndNode, nodesById)
  const connectsToCurrent = currentCluster.some(id => id === edge.a || id === edge.b)
  
  // Allow reconnection from depot cluster
  const atDepotCluster = currentCluster.some(id => startAnchorIds.includes(id))
  const connectsToDepot = atDepotCluster && (startAnchorIds.includes(edge.a) || startAnchorIds.includes(edge.b))
  
  if (!connectsToCurrent && !connectsToDepot) {
    return {
      valid: false,
      message: `Edge ${edge.id} doesn't connect to position ${currentEndNode}. Current neighbors: ${currentCluster.join(', ')}`,
      anchorId: null,
      newEndNode: null
    }
  }
  
  const anchorId = connectsToCurrent
    ? (currentCluster.includes(edge.a) ? edge.a : edge.b)
    : (startAnchorIds.includes(edge.a) ? edge.a : edge.b)
  const newEndNode = anchorId === edge.a ? edge.b : edge.a
  
  return {
    valid: true,
    message: null,
    anchorId,
    newEndNode
  }
}

/**
 * Reconstruct route state after removing the last edge.
 * 
 * When user undoes an edge, we need to replay the entire route to determine
 * which addresses have been visited and where the current position is.
 * This ensures state consistency after undo operations.
 * 
 * @param {Edge[]} edges - Remaining edges after undo
 * @param {string[]} startAnchorIds - Valid starting nodes (depot cluster)
 * @param {Object} nodesById - Node lookup map
 * @returns {Object} Reconstructed state with visited addresses and current position
 */
export function reconstructRouteAfterUndo(edges, startAnchorIds, nodesById) {
  const visited = new Set()
  let currentNode = null
  
  if (edges.length === 0) {
    return { visited, currentNode }
  }
  
  // Replay each edge to rebuild state
  edges.forEach((edge, idx) => {
    if (idx === 0) {
      // First edge: determine start and target
      const startId = startAnchorIds.includes(edge.a) ? edge.a : edge.b
      const targetId = edge.a === startId ? edge.b : edge.a
      const targetCluster = getCluster(targetId, nodesById)
      collectVisitedAddresses(targetCluster, nodesById, visited)
      currentNode = pickPrimaryNode(targetCluster, nodesById)
    } else {
      // Following edges: connect from current position
      const currentCluster = getCluster(currentNode, nodesById)
      const connectsToCurrent = currentCluster.some(id => id === edge.a || id === edge.b)
      const anchorId = connectsToCurrent
        ? (currentCluster.includes(edge.a) ? edge.a : edge.b)
        : (startAnchorIds.includes(edge.a) ? edge.a : edge.b)
      const newEndNode = anchorId === edge.a ? edge.b : edge.a
      const arrivalCluster = getCluster(newEndNode, nodesById)
      collectVisitedAddresses(arrivalCluster, nodesById, visited)
      currentNode = pickPrimaryNode(arrivalCluster, nodesById)
    }
  })
  
  return { visited, currentNode }
}

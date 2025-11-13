import tourSetup from '../data/tourSetup.json'

/**
 * Finds an alternative route between two nodes while avoiding blocked edges.
 * 
 * This uses Dijkstra's shortest path algorithm to calculate a detour when
 * a direct connection is blocked (e.g., due to construction work). The algorithm
 * ensures that the alternative route doesn't pass through any construction zones.
 * 
 * @param {string} startNodeId - ID of the starting node
 * @param {string} endNodeId - ID of the destination node  
 * @param {Set<string>} blockedEdgeIds - Set of specific edge IDs to exclude from the path
 * @returns {Array<Object>} List of edges forming the detour, or null if no path exists
 */
export function findDetour(startNodeId, endNodeId, blockedEdgeIds = new Set()) {
  // Build a graph representation excluding construction zones
  const graph = new Map()
  const edgeMap = new Map()
  
  tourSetup.edges.forEach(edge => {
    // Skip edges that are explicitly blocked for this detour calculation
    if (blockedEdgeIds.has(edge.id)) return
    
    // Also skip edges that are construction zones - we can't use those for detours
    if (edge.blocked) return
    
    if (!graph.has(edge.a)) graph.set(edge.a, [])
    if (!graph.has(edge.b)) graph.set(edge.b, [])
    
    graph.get(edge.a).push({ nodeId: edge.b, edge, distance: edge.lengthKm })
    graph.get(edge.b).push({ nodeId: edge.a, edge, distance: edge.lengthKm })
    
    edgeMap.set(`${edge.a}-${edge.b}`, edge)
    edgeMap.set(`${edge.b}-${edge.a}`, edge)
  })
  
  // Run Dijkstra's shortest path algorithm
  const distances = new Map()
  const previous = new Map()
  const unvisited = new Set()
  
  // Initialize all nodes with infinite distance except the start
  tourSetup.nodes.forEach(node => {
    distances.set(node.id, Infinity)
    unvisited.add(node.id)
  })
  distances.set(startNodeId, 0)
  
  while (unvisited.size > 0) {
    // Pick the unvisited node with smallest distance
    let current = null
    let minDist = Infinity
    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId)
      if (dist < minDist) {
        minDist = dist
        current = nodeId
      }
    }
    
    // No more reachable nodes, or we reached the destination
    if (current === null || minDist === Infinity) break
    if (current === endNodeId) break
    
    unvisited.delete(current)
    
    // Update distances to all neighbors
    const neighbors = graph.get(current) || []
    for (const { nodeId, edge, distance } of neighbors) {
      if (!unvisited.has(nodeId)) continue
      
      const newDist = distances.get(current) + distance
      if (newDist < distances.get(nodeId)) {
        distances.set(nodeId, newDist)
        previous.set(nodeId, { from: current, edge })
      }
    }
  }
  
  // Build the path by backtracking from destination to start
  if (!previous.has(endNodeId)) {
    return null // No route exists
  }
  
  const path = []
  let current = endNodeId
  
  while (previous.has(current)) {
    const { from, edge } = previous.get(current)
    path.unshift(edge)
    current = from
  }
  
  return path
}

/**
 * Replaces construction zones in a planned route with alternative paths.
 * 
 * When a delivery route includes roads that are blocked by construction work,
 * this function calculates detours around those obstacles. The vehicle cannot
 * drive through construction zones, so it must take alternative streets.
 * 
 * The function walks through the planned route edge by edge. When it encounters
 * a blocked edge, it uses pathfinding to find the shortest detour around it.
 * All detour edges are marked so they can be visualized differently on the map.
 * 
 * @param {Array<Object>} edges - The originally planned route edges
 * @param {Object} tourData - Complete tour data including all nodes
 * @returns {Object} Contains 'edges' (actual route with detours) and 'detours' (info about each detour)
 */
export function replaceBlockedEdges(edges, tourData) {
  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })
  
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  const resultEdges = []
  const detours = []
  
  // Start from depot, but if the first edge doesn't connect to depot,
  // infer the starting position from the first edge
  let currentNode = depotId
  if (edges.length > 0) {
    const firstEdge = edges[0]
    if (firstEdge.a !== depotId && firstEdge.b !== depotId) {
      // First edge doesn't connect to depot - start from edge.a
      currentNode = firstEdge.a
      if (import.meta.env.DEV) {
        console.log(`Route starts from ${currentNode} instead of depot ${depotId}`)
      }
    }
  }
  
  // Development logging to help debug routing issues
  if (import.meta.env.DEV) {
    const blockedCount = edges.filter(e => e.blocked).length
    console.log(`Analyzing route: ${edges.length} edges, ${blockedCount} construction zones, starting from ${currentNode}`)
  }
  
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]
    
    // Figure out where this edge leads from our current position
    let nextNode
    if (edge.a === currentNode) {
      nextNode = edge.b
    } else if (edge.b === currentNode) {
      nextNode = edge.a
    } else {
      // Edge doesn't connect to where we are - route is broken!
      // Try to find a path to connect to this edge
      if (import.meta.env.DEV) {
        console.warn(`Edge ${edge.id} doesn't connect to current position ${currentNode}. Trying to bridge gap...`)
      }
      
      // Try to find a path from currentNode to either edge.a or edge.b
      const pathToA = findDetour(currentNode, edge.a, new Set())
      const pathToB = findDetour(currentNode, edge.b, new Set())
      
      // Use whichever path is shorter (or exists)
      let bridgePath = null
      if (pathToA && pathToB) {
        const distA = pathToA.reduce((sum, e) => sum + (e.lengthKm || 1), 0)
        const distB = pathToB.reduce((sum, e) => sum + (e.lengthKm || 1), 0)
        bridgePath = distA <= distB ? pathToA : pathToB
        nextNode = distA <= distB ? edge.b : edge.a
      } else if (pathToA) {
        bridgePath = pathToA
        nextNode = edge.b
      } else if (pathToB) {
        bridgePath = pathToB
        nextNode = edge.a
      } else {
        // No path found - skip this edge entirely
        if (import.meta.env.DEV) {
          console.error(`Cannot reach edge ${edge.id} from ${currentNode}`)
        }
        continue
      }
      
      // Insert bridge path before the problematic edge
      if (bridgePath && bridgePath.length > 0) {
        bridgePath.forEach(bridgeEdge => {
          resultEdges.push({ ...bridgeEdge, isDetour: false })
        })
        currentNode = nextNode === edge.b ? edge.a : edge.b
      }
    }
    
    if (edge.blocked) {
      // Can't use this road - find a way around it
      const detourPath = findDetour(currentNode, nextNode, new Set([edge.id]))
      
      if (detourPath && detourPath.length > 0) {
        // Found a detour - add all its edges to the route
        detourPath.forEach(detourEdge => {
          resultEdges.push({ ...detourEdge, isDetour: true })
        })
        
        // Remember this detour for visualization and metrics
        detours.push({
          originalEdge: edge,
          detourEdges: detourPath,
          startNode: currentNode,
          endNode: nextNode
        })
      } else {
        // No alternative route exists (shouldn't happen in practice)
        resultEdges.push({ ...edge, isDetour: false })
      }
    } else {
      // Normal road - just use it
      resultEdges.push({ ...edge, isDetour: false })
    }
    
    currentNode = nextNode
  }
  
  return { edges: resultEdges, detours }
}

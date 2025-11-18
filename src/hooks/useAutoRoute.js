import { useState } from 'react'
import { clarkeWrightSavings } from '../algorithms/clarkeWright.js'
import { findDetour } from '../algorithms/pathfinding.js'

/**
 * Custom hook for automatic route generation
 * Handles optimization algorithm, edge sequence building, and route validation
 */
export function useAutoRoute(tourSetup, depotId) {
  const [autoRouteGenerated, setAutoRouteGenerated] = useState(false)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [autoRouteEdges, setAutoRouteEdges] = useState([])
  const [autoRouteError, setAutoRouteError] = useState(null)
  const [editableStopSequence, setEditableStopSequence] = useState([])

  // Build node lookup
  const nodesById = {}
  tourSetup.nodes.forEach(n => { nodesById[n.id] = n })

  // Get coincident nodes
  function getCluster(nodeId) {
    if (!nodeId) return []
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

  /**
   * Generate optimal route using Clarke-Wright Savings algorithm
   */
  async function generateAutoRoute() {
    setAutoGenerating(true)
    setAutoRouteError(null)
    
    try {
      // Get all address nodes
      const allAddresses = tourSetup.nodes
        .filter(n => n.type === 'address')
        .map(n => n.id)
      
      // Import network distance calculator
      const { calculateNetworkDistance } = await import('../algorithms/networkDistance.js')
      
      // Run Clarke-Wright optimization
      const optimizedSequence = await clarkeWrightSavings(allAddresses, depotId, (a, b) => {
        return calculateNetworkDistance(a, b, tourSetup, nodesById)
      })
      
      
      // Build edge sequence from optimized stops
      const edgesForRoute = []
      let currentPos = depotId
      
      // Connect depot to first address
      const depotCluster = getCluster(depotId)
      const firstCluster = getCluster(optimizedSequence[0])
      
      let firstEdge = null
      for (const depotNode of depotCluster) {
        for (const targetNode of firstCluster) {
          firstEdge = tourSetup.edges.find(ed =>
            (ed.a === depotNode && ed.b === targetNode) ||
            (ed.b === depotNode && ed.a === targetNode)
          )
          if (firstEdge) break
        }
        if (firstEdge) break
      }
      
      if (firstEdge) {
        edgesForRoute.push(firstEdge)
        currentPos = optimizedSequence[0]
      } else {
        const path = findDetour(depotCluster[0], firstCluster[0], new Set())
        if (path && path.length > 0) {
          edgesForRoute.push(...path)
          currentPos = optimizedSequence[0]
        } else {
          setAutoRouteError(`Keine Route vom Depot zur ersten Adresse ${optimizedSequence[0]}`)
          setAutoGenerating(false)
          return
        }
      }
      
      // Connect all consecutive addresses
      for (let i = 1; i < optimizedSequence.length; i++) {
        const from = optimizedSequence[i - 1]
        const to = optimizedSequence[i]
        
        const fromCluster = getCluster(from)
        const toCluster = getCluster(to)
        
        let directEdge = null
        for (const fromNode of fromCluster) {
          for (const toNode of toCluster) {
            directEdge = tourSetup.edges.find(ed =>
              (ed.a === fromNode && ed.b === toNode) ||
              (ed.b === fromNode && ed.a === toNode)
            )
            if (directEdge) break
          }
          if (directEdge) break
        }
        
        if (directEdge) {
          edgesForRoute.push(directEdge)
          currentPos = to
        } else {
          const fromJunction = fromCluster.find(id => nodesById[id]?.type === 'junction') || fromCluster[0]
          const toJunction = toCluster.find(id => nodesById[id]?.type === 'junction') || toCluster[0]
          const path = findDetour(fromJunction, toJunction, new Set())
          if (path && path.length > 0) {
            edgesForRoute.push(...path)
            currentPos = to
          }
        }
      }
      
      // Return to depot
      const lastCluster = getCluster(currentPos)
      const depotReturnCluster = getCluster(depotId)
      
      let returnEdge = null
      for (const fromNode of lastCluster) {
        for (const depotNode of depotReturnCluster) {
          returnEdge = tourSetup.edges.find(ed =>
            (ed.a === fromNode && ed.b === depotNode) ||
            (ed.b === fromNode && ed.a === depotNode)
          )
          if (returnEdge) break
        }
        if (returnEdge) break
      }
      
      if (returnEdge) {
        edgesForRoute.push(returnEdge)
      } else {
        const path = findDetour(lastCluster[0], depotReturnCluster[0], new Set())
        if (path && path.length > 0) {
          edgesForRoute.push(...path)
        }
      }
      
      // Remove duplicates
      const uniqueEdges = []
      const seenEdgeIds = new Set()
      edgesForRoute.forEach(edge => {
        if (!seenEdgeIds.has(edge.id)) {
          seenEdgeIds.add(edge.id)
          uniqueEdges.push(edge)
        }
      })
      
      // Calculate metrics
      let totalKm = 0
      uniqueEdges.forEach(edge => {
        const a = nodesById[edge.a]
        const b = nodesById[edge.b]
        if (a && b) {
          const lengthKm = edge.lengthKm || (euclideanDistance(a.x, a.y, b.x, b.y) * 0.01)
          totalKm += lengthKm
        }
      })
      
      
      // Update state
      const visited = new Set(optimizedSequence)
      const edgeIds = uniqueEdges.map(e => e.id)
      
      setAutoRouteEdges(uniqueEdges)
      setEditableStopSequence([...optimizedSequence])
      setAutoRouteGenerated(true)
      setAutoGenerating(false)
      
      if (visited.size < 18) {
        const missing = 18 - visited.size
        setAutoRouteError(`Achtung: ${missing} Adresse(n) nicht erreichbar.`)
      }
      
      return {
        edges: uniqueEdges,
        edgeIds,
        sequence: optimizedSequence,
        visitedAddresses: visited
      }
      
    } catch (error) {
      setAutoRouteError('Unerwarteter Fehler bei der Routengenerierung.')
      setAutoGenerating(false)
    }
  }

  function resetAutoRoute() {
    setAutoRouteGenerated(false)
    setAutoRouteEdges([])
    setAutoRouteError(null)
    setEditableStopSequence([])
  }

  return {
    autoRouteGenerated,
    autoGenerating,
    autoRouteEdges,
    autoRouteError,
    editableStopSequence,
    generateAutoRoute,
    resetAutoRoute,
    setEditableStopSequence
  }
}

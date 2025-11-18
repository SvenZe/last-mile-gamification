/**
 * MapInteraction.js
 * Mouse interaction handlers for the map canvas.
 * Handles edge/node picking and hit detection.
 */

import { euclideanDistance, pointToSegmentDistance } from '../utils/mathHelpers.js'

export function distancePointToSegment(px, py, ax, ay, bx, by) {
  return pointToSegmentDistance(px, py, ax, ay, bx, by)
}

export function pickEdgeAt(x, y, tourData) {
  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })

  // Collect all edges with their distances
  const candidates = []
  
  tourData.edges.forEach(e => {
    const a = nodesById[e.a]
    const b = nodesById[e.b]
    if (!a || !b) return

    const d = distancePointToSegment(x, y, a.x, a.y, b.x, b.y)
    const edgeLength = euclideanDistance(a.x, a.y, b.x, b.y)

    // Long edges need more precise clicking
    const threshold = edgeLength > 150 ? 1.5 : 4

    if (d <= threshold) {
      candidates.push({ edge: e, dist: d, length: edgeLength })
    }
  })

  if (candidates.length === 0) return null

  const shortEdges = candidates.filter(c => c.length <= 150)
  const longEdges = candidates.filter(c => c.length > 150)

  // If short edge found, ignore long edges completely
  const pool = shortEdges.length > 0 ? shortEdges : longEdges

  // Sort by distance, then by length
  pool.sort((a, b) => {
    if (Math.abs(a.dist - b.dist) < 0.5) {
      return a.length - b.length
    }
    return a.dist - b.dist
  })

  return pool[0].edge
}

/**
 * Find stop at mouse coordinates
 * Returns the addressId if a stop number circle is clicked
 */
export function pickStopAt(x, y, stopSequence, tourData) {
  if (!stopSequence) return null

  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })

  // Check if click is near any address node with a stop number
  for (const addressId of stopSequence) {
    const node = nodesById[addressId]
    if (!node || node.type !== 'address') continue

    // Check distance to number circle (radius 18)
    const dist = euclideanDistance(x, y, node.x, node.y)
    if (dist < 18) {
      return addressId
    }
  }
  
  return null
}

/**
 * Create mouse move handler
 */
export function createMouseMoveHandler({
  canvasRef,
  mode,
  onStopReorder,
  stopSequence,
  tourData,
  setHoveredStop,
  setHoveredEdge
}) {
  return function handleMouseMove(ev) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top

    // Check for stop hovering (in route adjustment mode)
    if (onStopReorder && stopSequence) {
      const stop = pickStopAt(x, y, stopSequence, tourData)
      setHoveredStop(stop)
      
      if (!stop && mode === 'manual') {
        const edge = pickEdgeAt(x, y, tourData)
        setHoveredEdge(edge ? edge.id : null)
      }
    } else if (mode === 'manual') {
      const edge = pickEdgeAt(x, y, tourData)
      setHoveredEdge(edge ? edge.id : null)
    }
  }
}

/**
 * Create click handler
 */
export function createClickHandler({
  canvasRef,
  mode,
  onStopReorder,
  stopSequence,
  tourData,
  selectedStop,
  setSelectedStop,
  onSelectEdge
}) {
  return function handleClick(ev) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top

    // Check for stop click (in route adjustment mode)
    if (onStopReorder && stopSequence) {
      const stop = pickStopAt(x, y, stopSequence, tourData)
      
      if (stop) {
        if (!selectedStop) {
          // Select first stop
          setSelectedStop(stop)
        } else if (selectedStop === stop) {
          // Deselect if clicking same stop
          setSelectedStop(null)
        } else {
          // Swap stops
          const oldIndex = stopSequence.indexOf(selectedStop)
          const newIndex = stopSequence.indexOf(stop)

          if (oldIndex !== -1 && newIndex !== -1) {
            const newSequence = [...stopSequence]
            newSequence[oldIndex] = stop
            newSequence[newIndex] = selectedStop
            onStopReorder(newSequence)
          }

          setSelectedStop(null)
        }
        return
      }
    }

    // Regular edge selection for manual mode
    if (mode === 'manual') {
      const edge = pickEdgeAt(x, y, tourData)
      if (edge) onSelectEdge(edge)
    }
  }
}

/**
 * Get cursor style based on mode and state
 */
export function getCursorStyle(mode, onStopReorder, selectedStop) {
  if (onStopReorder) {
    return selectedStop ? 'pointer' : 'grab'
  }
  
  if (mode === 'manual') {
    return 'crosshair'
  }
  
  return 'default'
}

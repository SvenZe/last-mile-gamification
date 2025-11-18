/**
 * RouteValidator.js
 * Checks if routes are valid (capacity, time, completeness).
 */

export function validateStopSequence(stopSequence, edges, vehicle, nodesById) {
  const messages = []
  let isValid = true
  
  let totalKm = 0
  edges.forEach(edge => {
    const a = nodesById[edge.a]
    const b = nodesById[edge.b]
    if (a && b) {
      const lengthKm = edge.lengthKm || (euclideanDistance(a.x, a.y, b.x, b.y) * 0.01)
      totalKm += lengthKm
    }
  })
  
  const driveTimeMin = (totalKm / 30) * 60
  const stopTimeMin = stopSequence.length * 5
  const totalTimeMin = driveTimeMin + stopTimeMin
  
  if (totalTimeMin > 240) {
    messages.push(`Route too long: ${Math.round(totalTimeMin)} min (recommended: max 240 min)`)
    isValid = false
  }
  
  if (stopSequence.length > vehicle.maxBoxes / 10) {
    messages.push(`Too many stops for vehicle capacity`)
    isValid = false
  }
  
  return { valid: isValid, messages, totalTimeMin, totalKm }
}

export function isRouteComplete(visitedAddresses, currentNode, depotId, totalAddresses = 18) {
  const allVisited = visitedAddresses.size === totalAddresses
  const atDepot = currentNode === depotId || !currentNode
  return allVisited && atDepot
}

/**
 * Calculate time windows for stops based on their sequence
 * Distributes stops evenly across 3-hour window (7-10 AM)
 * 6 customers per hour: 1-6 (7-8), 7-12 (8-9), 13-18 (9-10)
 */
export function calculateTimeWindows(stopSequence) {
  return stopSequence.map((stopId, idx) => {
    const stopNumber = idx + 1
    let windowStart, windowEnd
    
    if (stopNumber <= 6) {
      windowStart = 7
      windowEnd = 8
    } else if (stopNumber <= 12) {
      windowStart = 8
      windowEnd = 9
    } else {
      windowStart = 9
      windowEnd = 10
    }
    
    return {
      id: stopId,
      windowStart,
      windowEnd,
      windowDisplay: `${windowStart}-${windowEnd} Uhr`
    }
  })
}

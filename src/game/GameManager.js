import tourSetup from '../data/tourSetup.json'
import { calculateDistance } from '../algorithms/distance.js'
import { replaceBlockedEdges } from '../algorithms/pathfinding.js'
import { calculateTravelTime } from '../algorithms/trafficModel.js'

/**
 * GameManager.js
 * 
 * Runs the delivery simulation and calculates ESG scores. Takes a planned
 * route, checks for construction zones, calculates detours if needed, and
 * tracks which deliveries are on time. Compares results against baseline.
 */

export function simulateRoute(edges, vehicle, tourData, baseline, trafficModel = null, isAutoRoute = false, plannedDeliveryTimes = null) {
  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  
  // Some nodes sit on the same spot (e.g. depot + address at same location)
  const coincidentNodeIds = {}
  const positionGroups = new Map()
  
  tourData.nodes.forEach(node => {
    const key = `${node.x}:${node.y}`
    if (!positionGroups.has(key)) {
      positionGroups.set(key, [])
    }
    positionGroups.get(key).push(node.id)
  })
  
  positionGroups.forEach(group => {
    group.forEach(nodeId => {
      coincidentNodeIds[nodeId] = group
    })
  })
  
  // Handle construction zones: find detours if needed
  // Auto routes already avoid construction, manual routes need detours
  let actualRoute, detours
  if (isAutoRoute) {
    // Auto route: already avoids construction and is correctly sorted, use as-is
    actualRoute = edges
    detours = []
  } else {
    // Manual route: may hit construction, calculate detours
    const result = replaceBlockedEdges(edges, tourData)
    actualRoute = result.edges
    detours = result.detours
  }
  
  // No sorting needed - routes are already in correct order from generation
  
  // Find starting position from first edge considering depot cluster
  const depotCluster = coincidentNodeIds[depotId] || [depotId]
  let startNode = nodesById[depotId]
  
  if (actualRoute.length > 0) {
    const firstEdge = actualRoute[0]
    // Check which end of first edge is in depot cluster
    if (depotCluster.includes(firstEdge.a)) {
      startNode = nodesById[firstEdge.a]
    } else if (depotCluster.includes(firstEdge.b)) {
      startNode = nodesById[firstEdge.b]
    }
  }
  
  // First pass: Calculate total distance (simple sum of all edge lengths)
  let totalKm = 0
  actualRoute.forEach(edge => {
    const a = nodesById[edge.a]
    const b = nodesById[edge.b]
    if (a && b) {
      const edgeLength = edge.lengthKm ?? calculateDistance(a, b)
      totalKm += edgeLength
    }
  })
  
  // Now simulate actually driving the route
  let timeMin = 0
  const visited = []
  const actualDeliveryTimes = [] // When we arrive at each address
  let prevNode = startNode
  let constructionDelays = detours.length

  // For manual planning: track which addresses we pass by (but don't visit yet)
  const addressesEncountered = new Set()

  // Follow the route edge by edge
  let connectedCount = 0
  let skippedCount = 0
  
  actualRoute.forEach((edge, index) => {
    // Figure out which node we're moving to
    let nextId
    
    // Check if this edge connects to where we are now
    const currentPosNodes = coincidentNodeIds[prevNode.id] || [prevNode.id]
    
    if (currentPosNodes.includes(edge.a)) {
      nextId = edge.b
      connectedCount++
    } else if (currentPosNodes.includes(edge.b)) {
      nextId = edge.a
      connectedCount++
    } else {
      // Edge doesn't connect - skip it silently
      skippedCount++
      if (skippedCount <= 3) {
      }
      return
    }

    const next = nodesById[nextId]
    if (!next) {
      return // Skip this edge
    }

    // Get the distance for this segment (already counted in totalKm above)
    let edgeLength = edge.lengthKm ?? calculateDistance(prevNode, next)

    // Calculate driving time with traffic (use planning mode for realistic but consistent times)
    const travelTime = trafficModel ? 
      calculateTravelTime(edge, trafficModel, timeMin, false) // Use planning traffic (no random variation)
      : (edgeLength / 40) * 60 // Fallback: 40 km/h average

    timeMin += travelTime

    // Check for addresses at this position
    const nodesAtThisPosition = coincidentNodeIds[nextId] || [nextId]
    
    if (plannedDeliveryTimes && plannedDeliveryTimes.length > 0) {
      // Manual planning: only visit addresses according to planned order
      // Track which addresses we encounter (but don't necessarily stop at)
      nodesAtThisPosition.forEach(nodeAtPos => {
        const nodeData = nodesById[nodeAtPos]
        if (nodeData && nodeData.type === 'address') {
          addressesEncountered.add(nodeAtPos)
        }
      })
      
      // Check if the next planned delivery is available at our current position
      const nextPlannedIndex = visited.length
      if (nextPlannedIndex < plannedDeliveryTimes.length) {
        const nextPlanned = plannedDeliveryTimes[nextPlannedIndex]
        
        // If the planned address is available here, deliver it
        if (addressesEncountered.has(nextPlanned.nodeId)) {
          visited.push(nextPlanned.nodeId)
          
          const arrivalMin = Math.round(timeMin)
          actualDeliveryTimes.push({
            nodeId: nextPlanned.nodeId,
            arrivalMin,
            plannedWindow: nextPlanned.timeWindow,
            edgeId: edge.id,
            timeFromStart: arrivalMin
          })
          
          // Add 7 min stop time per address
          timeMin += 7
          
          // Remove from encountered set
          addressesEncountered.delete(nextPlanned.nodeId)
        }
      }
    } else {
      // Auto planning: visit addresses as we encounter them
      nodesAtThisPosition.forEach(nodeAtPos => {
        const nodeData = nodesById[nodeAtPos]
        if (nodeData && nodeData.type === 'address' && !visited.includes(nodeAtPos)) {
          visited.push(nodeAtPos)

          // Record actual arrival time before adding stop time
          const arrivalMin = Math.round(timeMin)
          actualDeliveryTimes.push({
            nodeId: nodeAtPos,
            arrivalMin,
            edgeId: edge.id,
            timeFromStart: arrivalMin
          })

          // Add 7 min stop time per address
          timeMin += 7
        }
      })
    }

    // Detours add time delays (distance is already in the detour edges)
    if (edge.isDetour) {
      timeMin += 15  // Extra time for navigation and finding the alternative route
    }

    // Move to next position
    prevNode = next
  })
  
  if (skippedCount > 0) {
  }

  // --- Ensure all addresses have delivery times, even if edge traversal missed some ---
  const allAddressIds = tourData.nodes.filter(n => n.type === 'address').map(n => n.id)
  const missingAddresses = allAddressIds.filter(id => !visited.includes(id))
  
  if (missingAddresses.length > 0) {
    // Add missing addresses with estimated times based on route position
    const avgTimePerStop = visited.length > 0 ? (timeMin / visited.length) : 30
    
    missingAddresses.forEach(addressId => {
      visited.push(addressId)
      const estimatedArrival = Math.round(visited.length * avgTimePerStop)
      
      actualDeliveryTimes.push({
        nodeId: addressId,
        arrivalMin: estimatedArrival,
        edgeId: 'estimated',
        timeFromStart: estimatedArrival
      })
    })
    
  }

  // Add return trip if we haven't come back to depot yet
  if (prevNode.id !== depotId) {
    const returnDistance = calculateDistance(prevNode, nodesById[depotId])
    totalKm += returnDistance
    
    // Calculate return time with traffic (use planning mode for consistency)
    if (trafficModel) {
      // Create a dummy edge for the return trip
      const returnEdge = {
        id: 'return',
        a: prevNode.id,
        b: depotId,
        lengthKm: returnDistance
      }
      // Add to traffic model if not exists
      if (!trafficModel.edges['return']) {
        trafficModel.edges['return'] = {
          isMainRoad: true,
          baseTraffic: 0.3
        }
      }
      const returnTime = calculateTravelTime(returnEdge, trafficModel, timeMin, false)
      timeMin += returnTime
    } else {
      timeMin += (returnDistance / 40) * 60 // Fallback: 40 km/h average
    }
  }

  // Cost calculation based on fixed and variable costs per km
  // Fixed costs per km (rent + salaries, same for all vehicles)
  const fixedCostPerKm = 10.23  // €/km for company overhead (rent + salaries)
  
  // Variable costs per km (vehicle-specific: fuel, maintenance, etc.)
  const variableCostPerKm = vehicle.costPerKm  // 0.57 (Diesel), 0.50 (Hybrid), 0.65 (Electric)
  
  // Total cost per km for this vehicle type
  const costPerKmBasis = fixedCostPerKm + variableCostPerKm
  
  // Calculate costs for this specific tour
  const kFix = fixedCostPerKm * totalKm
  const kVar = variableCostPerKm * totalKm
  const totalCost = kFix + kVar
  
  // Should equal costPerKmBasis * totalKm
  const costPerKmActual = totalCost / totalKm
  
  // Environmental impact
  const co2Kg = totalKm * vehicle.co2PerKm
  
  // Delivery success rate - based on time window compliance
  const numberOfStops = visited.length || baseline.numberOfStops
  
  // Calculate on-time deliveries
  let onTimeCount = 0
  
  if (plannedDeliveryTimes && plannedDeliveryTimes.length > 0) {
    // Manual planning: compare actual arrival time with planned time window
    actualDeliveryTimes.forEach(delivery => {
      const arrivalMin = delivery.arrivalMin
      const plannedWindow = delivery.plannedWindow
      
      // Check if actual arrival is within the planned window
      let withinPlannedWindow = false
      if (plannedWindow === '7-8' && arrivalMin <= 60) {
        withinPlannedWindow = true
      } else if (plannedWindow === '8-9' && arrivalMin > 60 && arrivalMin <= 120) {
        withinPlannedWindow = true
      } else if (plannedWindow === '9-10' && arrivalMin > 120 && arrivalMin <= 180) {
        withinPlannedWindow = true
      }
      
      if (withinPlannedWindow) {
        onTimeCount++
      }
    })
  } else {
    // Auto planning: calculate based on actual arrival times and time windows
    actualDeliveryTimes.forEach(delivery => {
      const arrivalMin = delivery.arrivalMin
      
      // Determine time window based on arrival time
      // 7-8 Uhr: 0-60 min, 8-9 Uhr: 61-120 min, 9-10 Uhr: 121-180 min
      let withinWindow = false
      if (arrivalMin <= 60) {
        // Should arrive in 7-8 window
        withinWindow = true
      } else if (arrivalMin <= 120) {
        // Should arrive in 8-9 window
        withinWindow = true
      } else if (arrivalMin <= 180) {
        // Should arrive in 9-10 window
        withinWindow = true
      } else {
        // After 10:00 - late
        withinWindow = false
      }
      
      if (withinWindow) {
        onTimeCount++
      }
    })
  }
  
  // Calculate delivery rate based on on-time deliveries
  let deliveryRate = numberOfStops > 0 ? (onTimeCount / numberOfStops) * 100 : 0
  
  // Cap at 100%
  deliveryRate = Math.min(100, deliveryRate)
  
  // Calculate efficiency metrics
  const costPerStop = totalCost / numberOfStops
  const successfulDeliveries = numberOfStops * (deliveryRate / 100)
  const costPerSuccess = successfulDeliveries > 0 ? totalCost / successfulDeliveries : totalCost
  const costPerKm = totalCost / totalKm

  // ESG scoring - compare performance to baseline
  const baselineTotalKm = baseline.totalDistance || baseline.totalKm || 27
  const baselineCostPerKm = baseline.totalCost / baselineTotalKm
  
  const co2Delta = baseline.co2Emissions - co2Kg  // Positive = improvement
  const totalCostDelta = baseline.totalCost - totalCost  // Positive = improvement (for display)
  const costPerKmDelta = baselineCostPerKm - costPerKm  // Positive = improvement (for scoring)
  const deliveryDelta = deliveryRate - (baseline.deliveryRate * 100)  // Positive = improvement
  
  // Convert improvements to point values
  // Improvements: +5 points per unit, Deteriorations: -10 points per unit
  let co2Pts = 0
  if (co2Delta > 0) {
    // CO2 reduced (good): +5 points per 0.1 kg reduction
    co2Pts = Math.round((co2Delta / 0.1) * 5)
  } else if (co2Delta < 0) {
    // CO2 increased (bad): -10 points per 0.1 kg increase
    co2Pts = Math.round((co2Delta / 0.1) * 10)  // co2Delta is negative, so result is negative
  }
  
  let costPts = 0
  if (totalCostDelta > 0) {
    // Total cost reduced (good): +5 points per €1 reduction
    costPts = Math.round(totalCostDelta * 5)
  } else if (totalCostDelta < 0) {
    // Total cost increased (bad): -10 points per €1 increase
    costPts = Math.round(totalCostDelta * 10)  // totalCostDelta is negative, so result is negative
  }
  
  let deliveryPts = 0
  if (deliveryDelta > 0) {
    // Delivery rate improved (good): +5 points per 1% improvement
    deliveryPts = Math.round(deliveryDelta * 5)
  } else if (deliveryDelta < 0) {
    // Delivery rate worsened (bad): -10 points per 1% decline
    deliveryPts = Math.round(deliveryDelta * 10)  // deliveryDelta is negative, so result is negative
  }
  
  // Overall ESG score with category weights
  const esgScore = (co2Pts * 0.4) + (costPts * 0.35) + (deliveryPts * 0.25)
  
  // Success means beating the baseline
  const passed = esgScore > 0

  return { 
    totalKm, 
    totalCost,
    kFix,
    kVar,
    fixedCostPerKm,
    variableCostPerKm,
    costPerKmBasis,
    costPerKmActual,
    costPerKm,
    co2Kg, 
    deliveryRate,
    numberOfStops,
    onTimeDeliveries: onTimeCount,
    costPerStop, 
    costPerSuccess, 
    durationMin: timeMin,
    totalTime: timeMin,
    constructionDelays,
    co2Pts, 
    costPts, 
    deliveryPts,
    esgScore,
    passed,
    co2Delta,
    costDelta: totalCostDelta,
    deliveryDelta,
    actualRoute,
    detours,
    actualDeliveryTimes
  }
}

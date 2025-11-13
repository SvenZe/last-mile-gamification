import tourSetup from '../data/tourSetup.json'
import { calculateDistance } from '../algorithms/distance.js'
import { replaceBlockedEdges } from '../algorithms/pathfinding.js'

/**
 * Simulates a delivery tour and calculates performance metrics.
 * 
 * This function takes a planned route and simulates what would actually happen
 * during delivery. It handles construction zones by automatically calculating
 * detours, tracks delivery times, and computes various performance indicators.
 * 
 * The simulation evaluates the route across three ESG dimensions:
 * - Environment (40% weight): CO2 emissions compared to baseline
 * - Economy (35% weight): Total costs compared to baseline  
 * - Social (25% weight): On-time delivery rate compared to baseline
 * 
 * Construction zones have significant impact: vehicles must detour around them,
 * adding extra distance and time. Any deliveries after a construction zone are
 * considered delayed and don't count toward the on-time delivery rate.
 * 
 * @param {Array<Object>} edges - The planned route as a list of edges
 * @param {Object} vehicle - Vehicle specs (costPerKm, co2PerKm)
 * @param {Object} tourData - Map data with nodes and edges
 * @param {Object} baseline - Reference metrics for comparison
 * @returns {Object} Complete simulation results including metrics and scores
 */
export function simulateRoute(edges, vehicle, tourData, baseline) {
  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  
  // Build a map of coincident nodes (nodes at the same x,y position)
  const coincidentNodeIds = {}
  const positionGroups = new Map()
  
  tourData.nodes.forEach(node => {
    const key = `${node.x}:${node.y}`
    if (!positionGroups.has(key)) {
      positionGroups.set(key, [])
    }
    positionGroups.get(key).push(node.id)
  })
  
  // Map each node to its group of coincident nodes
  positionGroups.forEach(group => {
    group.forEach(nodeId => {
      coincidentNodeIds[nodeId] = group
    })
  })
  
  // Replace any construction zones with detour routes
  const { edges: actualRoute, detours } = replaceBlockedEdges(edges, tourData)
  
  // Determine starting position from the first edge in the route
  let startNode = nodesById[depotId]
  if (actualRoute.length > 0) {
    const firstEdge = actualRoute[0]
    // Check if first edge connects to depot
    if (firstEdge.a === depotId || firstEdge.b === depotId) {
      startNode = nodesById[depotId]
    } else {
      // Route doesn't start from depot - start from first edge's starting point
      startNode = nodesById[firstEdge.a]
    }
  }
  
  let totalKm = 0
  let timeMin = 0
  const visited = []
  const visitedOnTime = []
  let prevNode = startNode
  let constructionDelays = detours.length
  let blockedEdgeEncountered = false

  // Drive the actual route and track what happens
  actualRoute.forEach((edge, index) => {
    // Debug: Check for broken route continuity
    if (import.meta.env.DEV) {
      if (edge.a !== prevNode.id && edge.b !== prevNode.id) {
        console.warn(`Route discontinuity at edge ${index}: Edge ${edge.id} (${edge.a} <-> ${edge.b}) doesn't connect to current position ${prevNode.id}`)
      }
    }
    
    // Determine next node - skip this edge if it doesn't connect
    let nextId
    if (edge.a === prevNode.id) {
      nextId = edge.b
    } else if (edge.b === prevNode.id) {
      nextId = edge.a
    } else {
      // Edge doesn't connect - skip it
      if (import.meta.env.DEV) {
        console.error(`Skipping disconnected edge ${edge.id} at index ${index}`)
      }
      return // Skip this edge
    }
    
    const next = nodesById[nextId]
    if (!next) {
      if (import.meta.env.DEV) {
        console.error(`Node ${nextId} not found!`)
      }
      return // Skip this edge
    }
    
    // Get the distance for this segment
    let edgeLength = edge.lengthKm ?? calculateDistance(prevNode, next)
    
    totalKm += edgeLength
    
    // Calculate driving time (30 km/h city speed)
    timeMin += (edgeLength / 30) * 60
    
    // Record address visits - check ALL nodes at this position (coincident nodes)
    // This handles cases where addresses overlap with junctions
    const nodesAtThisPosition = coincidentNodeIds[nextId] || [nextId]
    nodesAtThisPosition.forEach(nodeAtPos => {
      const nodeData = nodesById[nodeAtPos]
      if (nodeData && nodeData.type === 'address' && !visited.includes(nodeAtPos)) {
        visited.push(nodeAtPos)
        
        // Add 8 min stop time per address
        timeMin += 8
        
        // Deliveries after construction zones are late
        if (!blockedEdgeEncountered) {
          visitedOnTime.push(nodeAtPos)
        }
      }
    })
    
    // Detours add time delays (distance is already in the detour edges)
    // Check AFTER recording the address visit, so the flag is set for the NEXT addresses
    if (edge.isDetour) {
      timeMin += 15  // Extra time for navigation and finding the alternative route
      if (!blockedEdgeEncountered) {
        blockedEdgeEncountered = true
      }
    }
    
    prevNode = next
  })

  // Add return trip if we haven't come back to depot yet
  if (prevNode.id !== depotId) {
    const returnDistance = calculateDistance(prevNode, nodesById[depotId])
    totalKm += returnDistance
    timeMin += (returnDistance / 30) * 60
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
  
  // Delivery success rate - construction zones cause delays
  const numberOfStops = visited.length || baseline.numberOfStops
  const onTimeDeliveries = visitedOnTime.length
  let deliveryRate = (onTimeDeliveries / numberOfStops) * 100
  
  // If no construction zones encountered and all addresses visited, 100% delivery rate
  if (!blockedEdgeEncountered && onTimeDeliveries === numberOfStops) {
    deliveryRate = 100
  } else {
    // Otherwise cap at baseline rate (represents market conditions)
    const baselineRate = baseline.deliveryRate * 100
    deliveryRate = Math.min(deliveryRate, baselineRate)
    
    // Bonus for efficient routes (only if no construction delays)
    const kmReduction = baseline.totalDistance - totalKm
    if (kmReduction > 0 && !blockedEdgeEncountered) {
      deliveryRate = Math.min(100, deliveryRate + (kmReduction * 0.5))
    }
  }
  
  // Calculate efficiency metrics
  const costPerStop = totalCost / numberOfStops
  const successfulDeliveries = numberOfStops * (deliveryRate / 100)
  const costPerSuccess = successfulDeliveries > 0 ? totalCost / successfulDeliveries : totalCost
  const costPerKm = totalCost / totalKm

  // ESG scoring - compare performance to baseline
  const co2Delta = baseline.co2Emissions - co2Kg
  const costDelta = baseline.totalCost - totalCost
  const deliveryDelta = deliveryRate - (baseline.deliveryRate * 100)
  
  // Convert improvements to point values
  const co2Pts = Math.round((co2Delta / 0.1) * 10)
  const costPts = Math.round((costDelta / 1.0) * 10)
  const deliveryPts = Math.round((deliveryDelta / 5) * 10)
  
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
    costPerStop, 
    costPerSuccess, 
    durationMin: timeMin,
    constructionDelays,
    co2Pts, 
    costPts, 
    deliveryPts,
    esgScore,
    passed,
    co2Delta,
    costDelta,
    deliveryDelta,
    actualRoute,  // Return the actual driven route (with detours)
    detours       // Return detour information for visualization
  }
}

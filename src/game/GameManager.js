import tourSetup from '../data/tourSetup.json'
import { calculateDistance } from '../algorithms/distance.js'
import { nearestInsertion as nearestInsertionAlgorithm } from '../algorithms/nearestInsertion.js'
import { twoOpt as twoOptAlgorithm } from '../algorithms/twoOpt.js'
import { replaceBlockedEdges } from '../algorithms/pathfinding.js'

/**
 * Re-export routing algorithms for backward compatibility.
 * These are now implemented in the algorithms/ folder.
 */
export const nearestInsertion = nearestInsertionAlgorithm
export const twoOpt = twoOptAlgorithm

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
  
  // Replace any construction zones with detour routes
  const { edges: actualRoute, detours } = replaceBlockedEdges(edges, tourData)
  
  let totalKm = 0
  let timeMin = 0
  const visited = []
  const visitedOnTime = []
  let prevNode = nodesById[depotId]
  let constructionDelays = detours.length
  let blockedEdgeEncountered = false

  // Drive the actual route and track what happens
  actualRoute.forEach(edge => {
    const nextId = edge.a === prevNode.id ? edge.b : edge.a
    const next = nodesById[nextId]
    
    // Get the distance for this segment
    let edgeLength = edge.lengthKm ?? calculateDistance(prevNode, next)
    
    // Detours add time delays (distance is already in the detour edges)
    if (edge.isDetour) {
      timeMin += 15  // Extra time for navigation and finding the alternative route
      if (!blockedEdgeEncountered) {
        blockedEdgeEncountered = true
      }
    }
    
    totalKm += edgeLength
    
    // Calculate driving time (30 km/h city speed + 5 min per stop)
    timeMin += (edgeLength / 30) * 60 + 5
    
    // Record address visits
    if (next.type === 'address' && !visited.includes(nextId)) {
      visited.push(nextId)
      
      // Deliveries after construction zones are late
      if (!blockedEdgeEncountered) {
        visitedOnTime.push(nextId)
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

  // Cost calculation: fixed overhead plus distance-based variable cost
  const fixCost = 10.23
  const variableCost = totalKm * vehicle.costPerKm
  const totalCost = fixCost + variableCost
  
  // Environmental impact
  const co2Kg = totalKm * vehicle.co2PerKm / 1000
  
  // Delivery success rate - construction zones cause delays
  const numberOfStops = visited.length || baseline.numberOfStops
  const onTimeDeliveries = visitedOnTime.length
  let deliveryRate = (onTimeDeliveries / numberOfStops) * 100
  
  // Can't exceed baseline rate (represents market conditions)
  const baselineRate = baseline.deliveryRate * 100
  deliveryRate = Math.min(deliveryRate, baselineRate)
  
  // Bonus for efficient routes (only if no construction delays)
  const kmReduction = baseline.totalDistance - totalKm
  if (kmReduction > 0 && !blockedEdgeEncountered) {
    deliveryRate = Math.min(100, deliveryRate + (kmReduction * 0.5))
  }
  
  // Efficiency indicators
  const costPerStop = totalCost / numberOfStops
  const successfulDeliveries = numberOfStops * (deliveryRate / 100)
  const costPerSuccess = successfulDeliveries > 0 ? totalCost / successfulDeliveries : totalCost

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
    variableCost,
    fixCost,
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

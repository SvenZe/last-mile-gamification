import tourSetup from '../data/tourSetup.json'
import { calculateDistance } from '../algorithms/distance.js'
import { nearestInsertion as nearestInsertionAlgorithm } from '../algorithms/nearestInsertion.js'
import { twoOpt as twoOptAlgorithm } from '../algorithms/twoOpt.js'

/**
 * Re-export routing algorithms for backward compatibility.
 * These are now implemented in the algorithms/ folder.
 */
export const nearestInsertion = nearestInsertionAlgorithm
export const twoOpt = twoOptAlgorithm

/**
 * Simulates a delivery route and calculates all relevant metrics.
 * 
 * This is the core simulation function that:
 * - Tracks the vehicle's movement along selected edges
 * - Calculates distance, time, and costs
 * - Applies construction zone penalties (detours + delays)
 * - Computes ESG scores based on three dimensions:
 *   * Environmental (40%): CO2 emissions vs baseline
 *   * Economic (35%): Total cost vs baseline
 *   * Social (25%): Delivery rate vs baseline
 * 
 * @param {Array<Object>} edges - List of selected edges forming the route
 * @param {Object} vehicle - Vehicle with costPerKm and co2PerKm properties
 * @param {Object} tourData - Tour configuration with nodes
 * @param {Object} baseline - Reference metrics to compare against
 * @returns {Object} Simulation results with metrics and ESG scores
 */
export function simulateRoute(edges, vehicle, tourData, baseline) {
  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  let totalKm = 0
  let timeMin = 0
  const visited = []
  let prevNode = nodesById[depotId]
  let constructionDelays = 0

  // Follow the route edge by edge
  edges.forEach(edge => {
    const nextId = edge.a === prevNode.id ? edge.b : edge.a
    const next = nodesById[nextId]
    
    // Get edge length, or calculate it if not specified
    let edgeLength = edge.lengthKm ?? calculateDistance(prevNode, next)
    
    // Construction zones cause detours and delays
    if (edge.blocked) {
      edgeLength += 3.5  // 3.5 km detour
      timeMin += 15      // 15 minutes extra delay
      constructionDelays++
    }
    
    totalKm += edgeLength
    
    // Assume 30 km/h average speed in the city + 5 min stop time per segment
    timeMin += (edgeLength / 30) * 60 + 5
    
    // Track which addresses we visit
    if (next.type === 'address' && !visited.includes(nextId)) {
      visited.push(nextId)
    }
    
    prevNode = next
  })

  // If we didn't return to depot, add return trip
  if (prevNode.id !== depotId) {
    const returnDistance = calculateDistance(prevNode, nodesById[depotId])
    totalKm += returnDistance
    timeMin += (returnDistance / 30) * 60
  }

  // Calculate costs: fixed overhead + variable distance cost
  const fixCost = 10.23
  const variableCost = totalKm * vehicle.costPerKm
  const totalCost = fixCost + variableCost
  
  // Calculate CO2 emissions
  const co2Kg = totalKm * vehicle.co2PerKm / 1000
  
  // Calculate delivery rate (percentage of successful deliveries)
  // Baseline is 85%, but construction delays reduce it
  let deliveryRate = baseline.deliveryRate * 100
  if (constructionDelays > 0) {
    deliveryRate = Math.max(65, deliveryRate - (constructionDelays * 8))
  }
  
  // Shorter routes improve delivery rate slightly
  const kmReduction = baseline.totalDistance - totalKm
  if (kmReduction > 0) {
    deliveryRate = Math.min(100, deliveryRate + (kmReduction * 0.5))
  }
  
  // Calculate efficiency metrics
  const numberOfStops = visited.length || baseline.numberOfStops
  const costPerStop = totalCost / numberOfStops
  const successfulDeliveries = numberOfStops * (deliveryRate / 100)
  const costPerSuccess = successfulDeliveries > 0 ? totalCost / successfulDeliveries : totalCost

  // ESG score calculation - compare against baseline
  const co2Delta = baseline.co2Emissions - co2Kg
  const costDelta = baseline.totalCost - totalCost
  const deliveryDelta = deliveryRate - (baseline.deliveryRate * 100)
  
  // Convert deltas to points (positive = better than baseline)
  const co2Pts = Math.round((co2Delta / 0.1) * 10)
  const costPts = Math.round((costDelta / 1.0) * 10)
  const deliveryPts = Math.round((deliveryDelta / 5) * 10)
  
  // Weighted ESG score: Environment 40%, Economy 35%, Social 25%
  const esgScore = (co2Pts * 0.4) + (costPts * 0.35) + (deliveryPts * 0.25)
  
  // Pass if we beat the baseline
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
    deliveryDelta
  }
}

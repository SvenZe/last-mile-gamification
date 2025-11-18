import { clamp } from '../utils/mathHelpers.js'
import { createSeededRandom, generateBaseTraffic, randomIntensityVariation } from '../utils/trafficUtils.js'

/**
 * trafficModel.js
 * 
 * Simulates morning rush hour (7-10 AM). Traffic peaks at 8 AM and
 * gradually decreases. Has two modes:
 * - Planning: deterministic (same every time, for fair comparison)
 * - Simulation: adds random variation (more realistic)
 * 
 * Main roads get heavier traffic than side streets.
 */

export function generateTrafficModel(edges, seed = null) {
  const trafficModel = {
    edges: {},
    junctions: {},
    seed: seed || Date.now()
  }
  
  const seededRandom = createSeededRandom(trafficModel.seed)
  
  edges.forEach(edge => {
    const lengthKm = edge.lengthKm || 1.0
    const isMainRoad = lengthKm > 0.5 ? seededRandom() > 0.4 : seededRandom() > 0.7
    
    const baseTraffic = generateBaseTraffic(isMainRoad, seededRandom)
    
    trafficModel.edges[edge.id] = {
      isMainRoad,
      baseTraffic
    }
  })
  
  return trafficModel
}

// Traffic curve over time. Deterministic so planning is fair.
// Starts moderate, peaks at 8 AM, then eases off through 10 AM.
function getPlanningTrafficCurve(timeMinutes) {
  if (timeMinutes < 0) return 0.25  // Before 7 AM
  if (timeMinutes >= 180) return 0.20 // After 10 AM
  
  if (timeMinutes < 30) {
    // 7:00-7:30: Steady at 50%
    return 0.5
  } else if (timeMinutes < 60) {
    // 7:30-8:00: Climbing to peak (50% → 85%)
    return 0.5 + ((timeMinutes - 30) / 30) * 0.35
  } else if (timeMinutes < 90) {
    // 8:00-8:30: Dropping from peak (85% → 50%)
    return 0.85 - ((timeMinutes - 60) / 30) * 0.35
  } else if (timeMinutes < 120) {
    // 8:30-9:00: Steady at 50%
    return 0.5
  } else if (timeMinutes < 150) {
    // 9:00-9:30: Easing off (50% → 30%)
    return 0.5 - ((timeMinutes - 120) / 30) * 0.2
  } else {
    // 9:30-10:00: Light traffic (30% → 20%)
    return 0.3 - ((timeMinutes - 150) / 30) * 0.1
  }
}

/**
 * Gets traffic intensity for a specific road at a specific time
 * 
 * Combines the general rush hour pattern with this road's base traffic level.
 * Planning mode returns deterministic values; simulation mode adds randomness.
 * 
 * @param {number} timeMinutes - Minutes from 7 AM
 * @param {Object} edgeTrafficData - This road's traffic properties
 * @param {boolean} isSimulation - Add random variation if true
 * @returns {number} Traffic level from 0 (none) to 1 (gridlock)
 */
export function getTrafficIntensity(timeMinutes, edgeTrafficData, isSimulation = false) {
  const rushHourFactor = getPlanningTrafficCurve(timeMinutes)
  const baseTraffic = edgeTrafficData.baseTraffic
  
  // Mix base traffic (60%) with rush hour effect (40%)
  let intensity = baseTraffic * 0.6 + rushHourFactor * 0.4
  
  // In simulation, add ±10% randomness for realism
  if (isSimulation) {
    const variation = randomIntensityVariation()
    intensity = intensity * variation
  }
  
  return clamp(intensity, 0, 1)
}

/**
 * Maps traffic intensity to color categories for the map
 * 
 * @returns {string} 'low' (white), 'medium' (yellow), or 'high' (red)
 */
export function getTrafficCategory(intensity) {
  if (intensity >= 0.6) return 'high'
  if (intensity >= 0.4) return 'medium'
  return 'low'                           // White
}

/**
 * Calculate actual speed based on traffic intensity and category
 * High traffic (red, intensity >= 0.6): 20 km/h
 * Medium traffic (orange, intensity >= 0.4): 30 km/h
 * Low traffic (white, intensity < 0.4): 40 km/h
 */
export function getActualSpeed(intensity) {
  if (intensity >= 0.6) {
    return 20 // Red - heavy traffic
  } else if (intensity >= 0.4) {
    return 30 // Orange - moderate traffic
  } else {
    return 40 // White - normal traffic
  }
}

/**
 * Calculate junction delay in minutes
 * Depends on traffic intensity of connecting roads
 */
export function getJunctionDelay(junctionNodeId, connectedEdges, trafficModel, timeMinutes) {
  if (!connectedEdges || connectedEdges.length < 2) return 0
  
  // Calculate average traffic intensity of connected roads
  let totalIntensity = 0
  let count = 0
  
  connectedEdges.forEach(edgeId => {
    const edgeData = trafficModel.edges[edgeId]
    if (edgeData) {
      const intensity = getTrafficIntensity(timeMinutes, edgeData)
      totalIntensity += intensity
      count++
    }
  })
  
  if (count === 0) return 0
  
  const avgIntensity = totalIntensity / count
  
  // Delay ranges from 0 to 4 minutes based on intensity
  // More connecting roads = potentially higher delay
  const roadFactor = Math.min(1, connectedEdges.length / 4)
  const baseDelay = avgIntensity * 4 * roadFactor
  
  // Add some randomness (±20%)
  const randomFactor = 0.8 + Math.random() * 0.4
  
  return baseDelay * randomFactor
}

/**
 * Calculate travel time for an edge at a specific time
 * @param {Object} edge - The edge to calculate time for
 * @param {Object} trafficModel - Traffic model with edge data
 * @param {number} timeMinutes - Time from 7:00 AM (0-180)
 * @param {boolean} isSimulation - If true, use simulation traffic (with variation)
 * @returns {number} Travel time in minutes
 */
export function calculateTravelTime(edge, trafficModel, timeMinutes, isSimulation = false) {
  const edgeData = trafficModel.edges[edge.id]
  if (!edgeData) return 0
  
  const lengthKm = edge.lengthKm || 1.0
  const intensity = getTrafficIntensity(timeMinutes, edgeData, isSimulation)
  const speed = getActualSpeed(intensity)
  
  return (lengthKm / speed) * 60 // Convert to minutes
}

/**
 * Calculate total route time with traffic for planning phase
 * Uses deterministic traffic values for fair comparison
 */
export function calculatePlanningRouteTime(edges, trafficModel, startTime = 0) {
  let totalTime = 0
  let currentTime = startTime
  
  edges.forEach(edge => {
    const travelTime = calculateTravelTime(edge, trafficModel, currentTime, false) // Planning mode
    totalTime += travelTime
    currentTime += travelTime
  })
  
  return totalTime
}

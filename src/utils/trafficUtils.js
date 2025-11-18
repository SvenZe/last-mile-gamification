/**
 * trafficUtils.js
 * Random number generation for traffic simulation.
 */

export function randomTrafficVariation(min = 0.9, max = 1.15) {
  return min + Math.random() * (max - min)
}

export function randomDelayFactor(min = 0.8, max = 1.2) {
  return min + Math.random() * (max - min)
}

/**
 * Check if junction has traffic light (probability-based)
 * 
 * @param {number} probability - Probability of traffic light (0-1, default 0.2)
 * @returns {boolean} True if junction has traffic light
 */
export function hasTrafficLight(probability = 0.2) {
  return Math.random() < probability
}

/**
 * Generate seeded random number generator
 * Useful for consistent randomness across game sessions
 * 
 * @param {number} seed - Seed value
 * @returns {Function} Seeded random function (0-1)
 */
export function createSeededRandom(seed) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

/**
 * Generate random intensity variation for simulation mode
 * Adds ±10% randomness to traffic intensity
 * 
 * @returns {number} Variation factor (0.9 - 1.1)
 */
export function randomIntensityVariation() {
  return 0.9 + Math.random() * 0.2
}

/**
 * Generate base traffic level for a road segment
 * Main roads get higher traffic than side streets
 * 
 * @param {boolean} isMainRoad - Whether this is a main road
 * @param {Function} randomFn - Random function to use (default: Math.random)
 * @returns {number} Base traffic level (0-1)
 */
export function generateBaseTraffic(isMainRoad, randomFn = Math.random) {
  if (isMainRoad) {
    return 0.35 + randomFn() * 0.35  // 35-70% congestion
  } else {
    return 0.15 + randomFn() * 0.25  // 15-40% congestion
  }
}

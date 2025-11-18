/**
 * mathHelpers.js
 * Basic math functions used throughout the project.
 */

export function euclideanDistance(x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.hypot(dx, dy)
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

// Distance from a point to a line segment
export function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const vx = px - ax
  const vy = py - ay
  const ux = bx - ax
  const uy = by - ay
  const lenSq = ux * ux + uy * uy
  
  if (!lenSq) return Math.hypot(px - ax, py - ay)
  
  let t = (vx * ux + vy * uy) / lenSq
  t = clamp(t, 0, 1)
  
  const dx = ax + t * ux - px
  const dy = ay + t * uy - py
  
  return Math.hypot(dx, dy)
}

/**
 * Convert minutes to hours and minutes
 * @param {number} totalMinutes - Total minutes
 * @returns {Object} Object with hours and minutes properties
 */
export function minutesToHoursAndMinutes(totalMinutes) {
  const mins = Math.round(totalMinutes)
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  
  return { hours, minutes: remainingMins }
}

/**
 * Calculate percentage difference between two values
 * @param {number} value - Current value
 * @param {number} baseline - Baseline value
 * @returns {number} Percentage difference (positive = improvement)
 */
export function percentageDifference(value, baseline) {
  if (baseline === 0) return 0
  return ((baseline - value) / baseline) * 100
}

/**
 * Round to specified decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
export function roundTo(value, decimals) {
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1)
}

/**
 * Check if a value is within a range (inclusive)
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if value is in range
 */
export function inRange(value, min, max) {
  return value >= min && value <= max
}

/**
 * Calculate average of an array of numbers
 * @param {number[]} values - Array of numbers
 * @returns {number} Average value
 */
export function average(values) {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * Calculate sum of an array of numbers
 * @param {number[]} values - Array of numbers
 * @returns {number} Sum of all values
 */
export function sum(values) {
  return values.reduce((total, val) => total + val, 0)
}

/**
 * distance.js
 * Simple distance calculations using the canvas scale factor.
 */

import tourSetup from '../data/tourSetup.json'
import { euclideanDistance } from '../utils/mathHelpers.js'

export function calculateDistance(nodeA, nodeB) {
  const pixelDistance = euclideanDistance(nodeA.x, nodeA.y, nodeB.x, nodeB.y)
  
  return pixelDistance / tourSetup.canvas.scalePxPerKm
}

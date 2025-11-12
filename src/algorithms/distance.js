import tourSetup from '../data/tourSetup.json'

/**
 * Calculates the distance between two nodes in kilometers.
 * Uses the canvas scale factor to convert pixel distance to real-world distance.
 * 
 * @param {Object} nodeA - First node with x,y coordinates
 * @param {Object} nodeB - Second node with x,y coordinates
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(nodeA, nodeB) {
  const dx = nodeA.x - nodeB.x
  const dy = nodeA.y - nodeB.y
  const pixelDistance = Math.hypot(dx, dy)
  
  return pixelDistance / tourSetup.canvas.scalePxPerKm
}

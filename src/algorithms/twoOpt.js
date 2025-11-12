import tourSetup from '../data/tourSetup.json'
import { calculateDistance } from './distance.js'

/**
 * Implements the 2-opt local search algorithm to improve a tour.
 * 
 * 2-opt is a classic tour improvement method that works by removing two edges
 * from the tour and reconnecting them in a different way. If this reduces the
 * total distance, we keep the change and continue searching for improvements.
 * 
 * The algorithm:
 * 1. Start with an initial tour
 * 2. Try all possible pairs of edges
 * 3. For each pair, reverse the segment between them
 * 4. If this makes the tour shorter, keep the change
 * 5. Repeat until no more improvements can be found
 * 
 * This is a local optimization - it won't always find the global optimum,
 * but it usually improves the tour quality significantly.
 * 
 * @param {Array<string>} initialRoute - Initial tour (list of address IDs)
 * @returns {Array<string>} Improved tour
 */
export function twoOpt(initialRoute) {
  const nodesById = {}
  tourSetup.nodes.forEach(n => { nodesById[n.id] = n })
  
  const depotId = tourSetup.nodes.find(n => n.type === 'depot').id

  /**
   * Helper function to calculate total tour length including depot
   */
  const calculateTourLength = (route) => {
    let totalDistance = calculateDistance(
      nodesById[depotId],
      nodesById[route[0]]
    )
    
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += calculateDistance(
        nodesById[route[i]],
        nodesById[route[i + 1]]
      )
    }
    
    totalDistance += calculateDistance(
      nodesById[route[route.length - 1]],
      nodesById[depotId]
    )
    
    return totalDistance
  }

  let currentBest = initialRoute.slice()
  let foundImprovement = true
  
  // Keep searching until we can't find any more improvements
  while (foundImprovement) {
    foundImprovement = false
    
    // Try all possible pairs of edges
    for (let i = 0; i < currentBest.length - 1; i++) {
      for (let k = i + 1; k < currentBest.length; k++) {
        // Create a new route by reversing the segment between i and k
        const candidate = [
          ...currentBest.slice(0, i),
          ...currentBest.slice(i, k + 1).reverse(),
          ...currentBest.slice(k + 1)
        ]
        
        // If this is better, use it and mark that we found an improvement
        if (calculateTourLength(candidate) < calculateTourLength(currentBest)) {
          currentBest = candidate
          foundImprovement = true
        }
      }
    }
  }
  
  return currentBest
}

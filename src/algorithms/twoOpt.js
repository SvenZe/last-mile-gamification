import tourSetup from '../data/tourSetup.json'
import { calculateDistance } from './distance.js'
import { calculateNetworkDistance } from './networkDistance.js'

/**
 * 2-opt local search - a simple but effective way to improve tours.
 * 
 * The idea: take two edges in the tour and try reconnecting them differently.
 * If reversing the segment between them makes the tour shorter, keep it.
 * Keep doing this until no more improvements can be found.
 * 
 * This won't always find the absolute best solution, but it usually gets
 * pretty close and runs fast. Good for polishing routes from other algorithms.
 * 
 * @param {Array<string>} initialRoute - Starting tour
 * @returns {Array<string>} Improved tour
 */
export function twoOpt(initialRoute) {
  const nodesById = {}
  tourSetup.nodes.forEach(n => { nodesById[n.id] = n })
  
  const depotId = tourSetup.nodes.find(n => n.type === 'depot').id

  // Calculate tour length using actual road network distances
  const calculateTourLength = (route) => {
    let totalDistance = calculateNetworkDistance(
      depotId,
      route[0]
    )
    
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += calculateNetworkDistance(
        route[i],
        route[i + 1]
      )
    }
    
    totalDistance += calculateNetworkDistance(
      route[route.length - 1],
      depotId
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

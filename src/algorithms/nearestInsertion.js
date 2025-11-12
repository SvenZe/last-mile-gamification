import { calculateDistance } from './distance.js'

/**
 * Implements the Nearest Insertion heuristic for the Traveling Salesman Problem.
 * 
 * This algorithm builds a tour incrementally by always inserting the next address
 * at the position that causes the smallest increase in total tour length.
 * It's a greedy approach that usually produces good (but not optimal) solutions.
 * 
 * How it works:
 * 1. Start with one address in the route
 * 2. For each remaining address:
 *    - Try inserting it at every possible position in the current route
 *    - Calculate the additional distance this would add
 *    - Insert it where the increase is smallest
 * 3. Return the completed route
 * 
 * @param {Object} tourData - Tour configuration with nodes
 * @returns {Array<string>} Ordered list of address IDs (without depot)
 */
export function nearestInsertion(tourData) {
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  
  // Create lookup for quick node access
  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })
  
  // Get all address IDs that need to be visited
  const remainingAddresses = tourData.nodes
    .filter(n => n.type === 'address')
    .map(n => n.id)
  
  // Start with first address in the route
  const route = [remainingAddresses.shift()]
  
  // Keep adding addresses until all are in the route
  while (remainingAddresses.length > 0) {
    const nextAddress = remainingAddresses.shift()
    let bestPosition = 0
    let smallestIncrease = Infinity
    
    // Try inserting at every position in the current route
    for (let i = 0; i <= route.length; i++) {
      // Determine predecessor and successor for this insertion point
      const predecessor = i === 0 ? depotId : route[i - 1]
      const successor = i === route.length ? depotId : route[i]
      
      // Calculate distance increase:
      // new: (predecessor -> nextAddress) + (nextAddress -> successor)
      // minus old: (predecessor -> successor)
      const distanceIncrease = 
        calculateDistance(nodesById[predecessor], nodesById[nextAddress]) +
        calculateDistance(nodesById[nextAddress], nodesById[successor]) -
        calculateDistance(nodesById[predecessor], nodesById[successor])
      
      if (distanceIncrease < smallestIncrease) {
        smallestIncrease = distanceIncrease
        bestPosition = i
      }
    }
    
    // Insert the address at the best position found
    route.splice(bestPosition, 0, nextAddress)
  }
  
  return route
}

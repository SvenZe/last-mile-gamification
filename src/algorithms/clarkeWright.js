import tourSetup from '../data/tourSetup.json'
import { calculateNetworkDistance } from './networkDistance.js'

/**
 * Clarke-Wright Savings algorithm - a classic approach to the TSP.
 * 
 * The idea: instead of going depot→A→depot, depot→B→depot separately,
 * we can save distance by combining them into depot→A→B→depot.
 * 
 * The savings from combining routes is: d(depot,A) + d(depot,B) - d(A,B)
 * We sort all possible combinations by savings and merge routes greedily.
 * 
 * This often produces really good starting solutions for further optimization.
 * 
 * @param {Object} tourData - Network configuration
 * @returns {Array<string>} Tour as list of address IDs
 */
export function clarkeWrightSavings(tourData) {
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  
  // Create lookup for quick node access
  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })
  
  // Get all address IDs
  const addresses = tourData.nodes
    .filter(n => n.type === 'address')
    .map(n => n.id)
  
  if (addresses.length === 0) return []
  if (addresses.length === 1) return addresses
  
  // Calculate all pairwise savings
  const savings = []
  
  for (let i = 0; i < addresses.length - 1; i++) {
    for (let j = i + 1; j < addresses.length; j++) {
      const addrI = addresses[i]
      const addrJ = addresses[j]
      
      // Savings from merging: distance saved by not going depot->i->depot + depot->j->depot
      // Instead going depot->i->j->depot
      // CRITICAL: Use NETWORK distance for accurate savings calculation
      const distDepotI = calculateNetworkDistance(depotId, addrI)
      const distDepotJ = calculateNetworkDistance(depotId, addrJ)
      const distIJ = calculateNetworkDistance(addrI, addrJ)
      
      const saving = distDepotI + distDepotJ - distIJ
      
      savings.push({
        i: addrI,
        j: addrJ,
        value: saving
      })
    }
  }
  
  // Sort savings in descending order (largest savings first)
  savings.sort((a, b) => b.value - a.value)
  
  // Build route by applying savings
  // Each address starts in its own route
  const routes = addresses.map(addr => [addr])
  
  // Track which route each address belongs to
  const addressToRoute = {}
  addresses.forEach((addr, idx) => {
    addressToRoute[addr] = idx
  })
  
  // Helper: Check if address is at the end of its route
  const isRouteEnd = (addr) => {
    const routeIdx = addressToRoute[addr]
    const route = routes[routeIdx]
    return route[0] === addr || route[route.length - 1] === addr
  }
  
  // Helper: Merge two routes
  const mergeRoutes = (addr1, addr2) => {
    const route1Idx = addressToRoute[addr1]
    const route2Idx = addressToRoute[addr2]
    
    if (route1Idx === route2Idx) return false // Already in same route
    
    const route1 = routes[route1Idx]
    const route2 = routes[route2Idx]
    
    // Determine how to connect routes
    let newRoute = []
    
    if (route1[route1.length - 1] === addr1 && route2[0] === addr2) {
      // route1 ends with addr1, route2 starts with addr2: route1 + route2
      newRoute = [...route1, ...route2]
    } else if (route1[0] === addr1 && route2[route2.length - 1] === addr2) {
      // route1 starts with addr1, route2 ends with addr2: route2 + route1
      newRoute = [...route2, ...route1]
    } else if (route1[route1.length - 1] === addr1 && route2[route2.length - 1] === addr2) {
      // Both at end: route1 + reverse(route2)
      newRoute = [...route1, ...route2.reverse()]
    } else if (route1[0] === addr1 && route2[0] === addr2) {
      // Both at start: reverse(route1) + route2
      newRoute = [...route1.reverse(), ...route2]
    } else {
      return false // Can't merge (addresses not at ends)
    }
    
    // Update route array
    routes[route1Idx] = newRoute
    routes[route2Idx] = []
    
    // Update address-to-route mapping
    newRoute.forEach(addr => {
      addressToRoute[addr] = route1Idx
    })
    
    return true
  }
  
  // Apply savings in order
  for (const saving of savings) {
    const { i, j } = saving
    
    // Check if both addresses are at route ends and in different routes
    if (isRouteEnd(i) && isRouteEnd(j) && addressToRoute[i] !== addressToRoute[j]) {
      mergeRoutes(i, j)
    }
  }
  
  // Find the non-empty route (should be only one)
  const finalRoute = routes.find(r => r.length > 0)
  
  return finalRoute || addresses
}

import tourSetup from '../data/tourSetup.json'
import { calculateNetworkDistance } from './networkDistance.js'

/**
 * clarkeWright.js
 * 
 * Classic TSP heuristic from 1964. Instead of separate depot trips for each
 * address, we merge them when doing so saves distance.
 * 
 * Example: depot→A→depot + depot→B→depot becomes depot→A→B→depot
 * Savings = dist(depot,A) + dist(depot,B) - dist(A,B)
 * 
 * We sort all pairs by savings and greedily combine routes. Works well
 * as a starting point for more sophisticated algorithms.
 */

export function clarkeWrightSavings(tourData) {
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  
  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })
  
  const addresses = tourData.nodes
    .filter(n => n.type === 'address')
    .map(n => n.id)
  
  if (addresses.length === 0) return []
  if (addresses.length === 1) return addresses
  
  // Calculate how much distance we save by combining each pair
  const savings = []
  
  for (let i = 0; i < addresses.length - 1; i++) {
    for (let j = i + 1; j < addresses.length; j++) {
      const addrI = addresses[i]
      const addrJ = addresses[j]
      
      // Use actual road network distances (not straight-line)
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
  
  savings.sort((a, b) => b.value - a.value)
  
  // Start with each address in its own route
  const routes = addresses.map(addr => [addr])
  
  const addressToRoute = {}
  addresses.forEach((addr, idx) => {
    addressToRoute[addr] = idx
  })
  
  const isRouteEnd = (addr) => {
    const routeIdx = addressToRoute[addr]
    const route = routes[routeIdx]
    return route[0] === addr || route[route.length - 1] === addr
  }
  
  const mergeRoutes = (addr1, addr2) => {
    const route1Idx = addressToRoute[addr1]
    const route2Idx = addressToRoute[addr2]
    
    if (route1Idx === route2Idx) return false // Already in same route
    
    const route1 = routes[route1Idx]
    const route2 = routes[route2Idx]
    
    let newRoute = []
    
    if (route1[route1.length - 1] === addr1 && route2[0] === addr2) {
      newRoute = [...route1, ...route2]
    } else if (route1[0] === addr1 && route2[route2.length - 1] === addr2) {
      newRoute = [...route2, ...route1]
    } else if (route1[route1.length - 1] === addr1 && route2[route2.length - 1] === addr2) {
      newRoute = [...route1, ...route2.reverse()]
    } else if (route1[0] === addr1 && route2[0] === addr2) {
      newRoute = [...route1.reverse(), ...route2]
    } else {
      return false
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
  
  for (const saving of savings) {
    const { i, j } = saving
    
    if (isRouteEnd(i) && isRouteEnd(j) && addressToRoute[i] !== addressToRoute[j]) {
      mergeRoutes(i, j)
    }
  }
  
  const finalRoute = routes.find(r => r.length > 0)
  
  return finalRoute || addresses
}

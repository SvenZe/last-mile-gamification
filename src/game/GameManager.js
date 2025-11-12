import tourSetup from '../data/tourSetup.json'

function distKm(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y
  return Math.hypot(dx, dy) / tourSetup.canvas.scalePxPerKm
}

export function nearestInsertion(tourData) {
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  const nodesById = {}; tourData.nodes.forEach(n => nodesById[n.id] = n)
  const addrs = tourData.nodes.filter(n => n.type === 'address').map(n => n.id)

  const route = [addrs.shift()]
  while (addrs.length) {
    const next = addrs.shift()
    let bestI = 0, bestInc = Infinity
    for (let i=0; i<=route.length; i++) {
      const prev = i===0 ? depotId : route[i-1]
      const nxt  = i===route.length ? depotId : route[i]
      const inc = distKm(nodesById[prev], nodesById[next]) +
                  distKm(nodesById[next], nodesById[nxt]) -
                  distKm(nodesById[prev], nodesById[nxt])
      if (inc < bestInc) { bestInc = inc; bestI = i }
    }
    route.splice(bestI, 0, next)
  }
  return route
}

export function twoOpt(route) {
  const nodesById = {}; tourSetup.nodes.forEach(n => nodesById[n.id] = n)
  const depotId = tourSetup.nodes.find(n => n.type === 'depot').id

  const length = (r) => {
    let s = distKm(nodesById[depotId], nodesById[r[0]])
    for (let i=0;i<r.length-1;i++) s += distKm(nodesById[r[i]], nodesById[r[i+1]])
    s += distKm(nodesById[r[r.length-1]], nodesById[depotId])
    return s
  }

  let best = route.slice(), improved = true
  while (improved) {
    improved = false
    for (let i=0;i<best.length-1;i++) {
      for (let k=i+1;k<best.length;k++) {
        const candidate = best.slice(0,i).concat(best.slice(i,k+1).reverse(), best.slice(k+1))
        if (length(candidate) < length(best)) { best = candidate; improved = true }
      }
    }
  }
  return best
}

export function simulateRoute(edges, vehicle, tourData, baseline) {
  const nodesById = {}; tourData.nodes.forEach(n => nodesById[n.id] = n)
  const depotId = tourData.nodes.find(n => n.type === 'depot').id
  let totalKm = 0, timeMin = 0
  const visited = []
  let prevNode = nodesById[depotId]
  let constructionDelays = 0

  edges.forEach(e => {
    const nextId = e.a === prevNode.id ? e.b : e.a
    const next = nodesById[nextId]
    let len = e.lengthKm ?? distKm(prevNode, next)
    
    // Baustellen-Logik: Umweg und Zeitverzögerung
    if (e.blocked) {
      len += 3.5  // Umweg in km
      timeMin += 15  // Zusätzliche Verzögerung
      constructionDelays++
    }
    
    totalKm += len
    timeMin += (len / 30) * 60 + 5  // 30 km/h Durchschnittsgeschwindigkeit + 5 Min Stopzeit
    if (next.type === 'address' && !visited.includes(nextId)) visited.push(nextId)
    prevNode = next
  })

  // Rückfahrt zum Depot
  if (prevNode.id !== depotId) {
    const back = distKm(prevNode, nodesById[depotId])
    totalKm += back
    timeMin += (back / 30) * 60
  }

  // Fixkosten hinzufügen (10,23 € wie in der Konzeption)
  const fixCost = 10.23
  const variableCost = totalKm * vehicle.costPerKm
  const totalCost = fixCost + variableCost
  
  const co2Kg = totalKm * vehicle.co2PerKm / 1000
  
  // Zustellquote: Baseline ist 85%, reduziert sich durch Baustellen-Verzögerungen
  let deliveryRate = baseline.deliveryRate * 100 // Konvertiere zu Prozent
  if (constructionDelays > 0) {
    deliveryRate = Math.max(65, deliveryRate - (constructionDelays * 8))
  }
  // Verbesserung wenn Route kürzer ist
  const kmReduction = baseline.totalDistance - totalKm
  if (kmReduction > 0) {
    deliveryRate = Math.min(100, deliveryRate + (kmReduction * 0.5))
  }
  
  const numberOfStops = visited.length || baseline.numberOfStops
  const costPerStop = totalCost / numberOfStops
  const successfulDeliveries = numberOfStops * (deliveryRate / 100)
  const costPerSuccess = successfulDeliveries > 0 ? totalCost / successfulDeliveries : totalCost

  // ESG-Punkteberechnung nach Konzeption
  const co2Delta = baseline.co2Emissions - co2Kg
  const costDelta = baseline.totalCost - totalCost
  const deliveryDelta = deliveryRate - (baseline.deliveryRate * 100)
  
  const co2Pts = Math.round((co2Delta / 0.1) * 10)
  const costPts = Math.round((costDelta / 1.0) * 10)
  const deliveryPts = Math.round((deliveryDelta / 5) * 10)
  
  // Gewichtung: Umwelt 40%, Ökonomie 35%, Soziales 25%
  const esgScore = (co2Pts * 0.4) + (costPts * 0.35) + (deliveryPts * 0.25)
  
  const passed = esgScore > 0

  return { 
    totalKm, 
    totalCost,
    variableCost,
    fixCost,
    co2Kg, 
    deliveryRate,
    numberOfStops,
    costPerStop, 
    costPerSuccess, 
    durationMin: timeMin,
    constructionDelays,
    co2Pts, 
    costPts, 
    deliveryPts,
    esgScore,
    passed,
    // Deltas für Visualisierung
    co2Delta,
    costDelta,
    deliveryDelta
  }
}

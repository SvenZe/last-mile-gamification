import React, { useState, useMemo } from 'react'
import tourSetup from './data/tourSetup.json'
import baselineMetrics from './data/baselineMetrics.json'
import { vehicles } from './data/vehicles.js'
import MapView from './map/MapView.jsx'
import { simulateRoute } from './game/GameManager.js'
import { clarkeWrightSavings } from './algorithms/clarkeWright.js'
import { findDetour } from './algorithms/pathfinding.js'
import VehicleSelector from './components/VehicleSelector.jsx'
import ModeSelector from './components/ModeSelector.jsx'
import ESGDashboard from './components/ESGDashboard.jsx'

/**
 * Last-Mile Delivery Route Optimization Game
 * 
 * Educational game where players learn about efficient route planning.
 * Two modes: manual planning (click edges) or automatic optimization.
 * Routes are scored on distance, time, and delivery success rate.
 * 
 * Phases: intro → vehicle selection → route planning → results
 */
export default function App() {
  // Game phase control
  const [phase, setPhase] = useState('intro')
  
  // Player choices
  const [vehicleId, setVehicleId] = useState(null)
  const [mode, setMode] = useState(null)  // 'manual' or 'auto'
  
  // Route planning state (manual mode)
  const [manualEdges, setManualEdges] = useState([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([])  // using Array instead of Set for React compatibility
  const [visitedAddresses, setVisitedAddresses] = useState(new Set())
  const [currentEndNode, setCurrentEndNode] = useState(null)
  const [selectionMessage, setSelectionMessage] = useState(null)
  const [plannedRoute, setPlannedRoute] = useState([])  // The route player planned (may contain blocked edges)
  
  // Auto mode state
  const [autoRouteGenerated, setAutoRouteGenerated] = useState(false)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [autoRouteEdges, setAutoRouteEdges] = useState([])
  const [autoRouteError, setAutoRouteError] = useState(null)
  
  // Simulation results
  const [report, setReport] = useState(null)

  // Use Level 3 baseline metrics as reference point
  const baseline = baselineMetrics.level3
  
  // Build a lookup table for quick node access by ID
  const nodesById = useMemo(() => {
    const lookup = {}
    tourSetup.nodes.forEach(node => {
      lookup[node.id] = node
    })
    return lookup
  }, [])

  /**
   * Map of nodes that share the same coordinates.
   * Some nodes overlap on the map (e.g., depot shares coordinates with K02).
   * This map helps us handle edge selection when multiple nodes are at the same position.
   * 
   * Structure: { nodeId: [nodeId, otherNodeId, ...] }
   * Each node maps to an array of all nodes at that position (including itself).
   */
  const coincidentNodeIds = useMemo(() => {
    const groups = new Map()
    
    // Group nodes by their x,y position
    tourSetup.nodes.forEach(node => {
      const key = `${node.x}:${node.y}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(node.id)
    })
    
    // Create a lookup where each node ID maps to all overlapping node IDs
    const map = {}
    groups.forEach(ids => {
      ids.forEach(id => {
        map[id] = ids
      })
    })
    
    return map
  }, [])

  const depotNode = tourSetup.nodes.find(n => n.type === 'depot')
  const depotId = depotNode?.id
  const startAnchorIds = useMemo(() => {
    if (!depotNode || !depotId) return []
    return coincidentNodeIds[depotId] ?? [depotId]
  }, [depotNode, depotId, coincidentNodeIds])

  function getCluster(nodeId) {
    if (!nodeId) return []
    return coincidentNodeIds[nodeId] ?? [nodeId]
  }

  function pickPrimaryNode(cluster) {
    if (!cluster || cluster.length === 0) return null
    const hasDepot = cluster.some(id => nodesById[id]?.type === 'depot')
    if (hasDepot) {
      const depotCandidate = cluster.find(id => nodesById[id]?.type === 'depot')
      return depotCandidate ?? cluster[0]
    }
    const addressCandidate = cluster.find(id => nodesById[id]?.type === 'address')
    if (addressCandidate) return addressCandidate
    const junctionCandidate = cluster.find(id => nodesById[id]?.type === 'junction')
    if (junctionCandidate) return junctionCandidate
    return cluster[0]
  }

  function collectVisitedAddresses(cluster, targetSet) {
    cluster.forEach(id => {
      if (nodesById[id]?.type === 'address') targetSet.add(id)
    })
  }

  function handleEdgeSelect(edge) {
    if (mode !== 'manual') return
    if (!depotId) return

    if (manualEdges.length === 0) {
      // Erste Kante: muss am Depot (oder überlappendem Startknoten) liegen
      const touchesStart = startAnchorIds.includes(edge.a) || startAnchorIds.includes(edge.b)
      if (!touchesStart) {
        setSelectionMessage('❌ Erste Kante muss am Depot starten (Depot teilt sich Koordinaten mit K02).')
        return
      }

      const startId = startAnchorIds.includes(edge.a) ? edge.a : edge.b
      const targetId = edge.a === startId ? edge.b : edge.a

      // Prüfe, ob Adressen auf dieser Kante sind (inkl. überlappender Knoten)
      const newVisited = new Set(visitedAddresses)
      const targetCluster = getCluster(targetId)
      collectVisitedAddresses(targetCluster, newVisited)
      
      const newPrimary = pickPrimaryNode(targetCluster)
      
      // Alle States in einem Batch aktualisieren
      setManualEdges([edge])
      setSelectedEdgeIds([edge.id])
      setVisitedAddresses(newVisited)
      setCurrentEndNode(newPrimary)
      setSelectionMessage(null)
    } else {
      const currentCluster = getCluster(currentEndNode)

      // Folgende Kanten: müssen an aktuellen Standort (inkl. überlappender Knoten) anschließen
      const connectsToCurrent = currentCluster.some(id => id === edge.a || id === edge.b)

      // Wenn wir am Depot-Cluster stehen, darf erneut vom Depot gestartet werden
      const atDepotCluster = currentCluster.some(id => startAnchorIds.includes(id))
      const connectsToDepot = atDepotCluster && (startAnchorIds.includes(edge.a) || startAnchorIds.includes(edge.b))
      
      if (!connectsToCurrent && !connectsToDepot) {
        // Kante schließt nicht an - ignorieren (verhindert "tote" Kanten)
        setSelectionMessage(`❌ Kante ${edge.id} schließt nicht an Position ${currentEndNode} an. Aktuelle Nachbarn: ${currentCluster.join(', ')}`)
        return
      }
      
      const anchorId = connectsToCurrent
        ? (currentCluster.includes(edge.a) ? edge.a : edge.b)
        : (startAnchorIds.includes(edge.a) ? edge.a : edge.b)
      const newEndNode = anchorId === edge.a ? edge.b : edge.a
      
      // Prüfe, ob neue Adressen besucht werden
      const newVisited = new Set(visitedAddresses)
      const arrivalCluster = getCluster(newEndNode)
      collectVisitedAddresses(arrivalCluster, newVisited)
      
      const newPrimary = pickPrimaryNode(arrivalCluster)
      const newEdges = [...manualEdges, edge]
      
      // Prüfe ob Edge bereits selektiert (verhindert Duplikate bei Doppelklick)
      if (selectedEdgeIds.includes(edge.id)) {
        return
      }
      
      const newSelectedIds = [...selectedEdgeIds, edge.id]
      
      // Alle States in einem Batch aktualisieren
      setManualEdges(newEdges)
      setSelectedEdgeIds(newSelectedIds)
      setVisitedAddresses(newVisited)
      setCurrentEndNode(newPrimary)
      setSelectionMessage(null)
    }
  }  function undoLastEdge() {
    if (manualEdges.length === 0) return
    
    // Entferne letzte Kante
    const newEdges = manualEdges.slice(0, -1)
    const newSelectedIds = selectedEdgeIds.slice(0, -1)
    
    // Rekonstruiere visitedAddresses und currentEndNode
    const newVisited = new Set()
    let newCurrentNode = null
    
    if (newEdges.length === 0) {
      // Keine Kanten mehr - zurück zum Anfang
      newCurrentNode = null
    } else {
      // Gehe alle verbliebenen Kanten durch
      newEdges.forEach((edge, idx) => {
        if (idx === 0) {
          // Erste Kante
          const startId = startAnchorIds.includes(edge.a) ? edge.a : edge.b
          const targetId = edge.a === startId ? edge.b : edge.a
          const targetCluster = getCluster(targetId)
          collectVisitedAddresses(targetCluster, newVisited)
          newCurrentNode = pickPrimaryNode(targetCluster)
        } else {
          // Folgende Kanten
          const prevEdge = newEdges[idx - 1]
          const currentCluster = getCluster(newCurrentNode)
          const connectsToCurrent = currentCluster.some(id => id === edge.a || id === edge.b)
          const anchorId = connectsToCurrent
            ? (currentCluster.includes(edge.a) ? edge.a : edge.b)
            : (startAnchorIds.includes(edge.a) ? edge.a : edge.b)
          const newEndNode = anchorId === edge.a ? edge.b : edge.a
          const arrivalCluster = getCluster(newEndNode)
          collectVisitedAddresses(arrivalCluster, newVisited)
          newCurrentNode = pickPrimaryNode(arrivalCluster)
        }
      })
    }
    
    setManualEdges(newEdges)
    setSelectedEdgeIds(newSelectedIds)
    setVisitedAddresses(newVisited)
    setCurrentEndNode(newCurrentNode)
    setSelectionMessage(null)
  }

  function resetRoute() {
    setManualEdges([])
    setSelectedEdgeIds([])  // Array statt Set
    setVisitedAddresses(new Set())
    setCurrentEndNode(null)
    setSelectionMessage(null)
  }

  async function generateAutoRoute() {
    setAutoGenerating(true)
    setAutoRouteError(null)
    console.log('\n🚀 Generating optimal route...')
    console.log('─'.repeat(50))
    
    try {
      // Phase 1: Build initial route candidates
      console.log('\n📊 Phase 1: Building initial candidates')
      const startTime1 = performance.now()
      
      const candidates = []
      
      const allAddresses = tourSetup.nodes
        .filter(n => n.type === 'address')
        .map(n => n.id)
      
      // Import network distance calculator once at the top
      const { calculateNetworkDistance } = await import('./algorithms/networkDistance.js')
      const nodesById = {}
      tourSetup.nodes.forEach(n => { nodesById[n.id] = n })
      const depotId = tourSetup.nodes.find(n => n.type === 'depot').id
      
      // Strategy 1: Clarke-Wright heuristic
      console.log('   • Clarke-Wright heuristic')
      const cwSequence = clarkeWrightSavings(tourSetup)
      candidates.push(cwSequence)
      console.log(`      ✓ Generated Clarke-Wright sequence`)
      
      // Strategy 2: Nearest neighbor from each address
      console.log('   • Nearest neighbor (18 variations)')
      
      for (const startAddr of allAddresses) {
        const route = []
        const remaining = allAddresses.filter(a => a !== startAddr)
        route.push(startAddr)
        
        let current = startAddr
        while (remaining.length > 0) {
          // Find nearest unvisited address
          let nearestDist = Infinity
          let nearestAddr = null
          for (const addr of remaining) {
            const dist = calculateNetworkDistance(current, addr)
            if (dist < nearestDist) {
              nearestDist = dist
              nearestAddr = addr
            }
          }
          route.push(nearestAddr)
          remaining.splice(remaining.indexOf(nearestAddr), 1)
          current = nearestAddr
        }
        candidates.push(route)
      }
      console.log('     ✓ 18 sequences')
      
      // Strategy 3: Random sampling for diversity
      console.log('   • Random sampling (2000 permutations)')
      for (let i = 0; i < 2000; i++) {
        const shuffled = [...allAddresses]
        for (let j = shuffled.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1))
          ;[shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]]
        }
        candidates.push(shuffled)
      }
      console.log('     ✓ 2000 sequences')
      
      const time1 = performance.now() - startTime1
      console.log(`   ✓ ${candidates.length} candidates in ${(time1/1000).toFixed(1)}s`)
      
      // Phase 2: Optimize with Lin-Kernighan-Helsgaun
      console.log('\n🔥 Phase 2: Optimizing routes')
      const startTime2 = performance.now()
      
      const optimizedCandidates = []
      
      // Helper to calculate network distance for a route (uses variables from Phase 1)
      const calculateRouteDistance = (route) => {
        let total = calculateNetworkDistance(depotId, route[0])
        for (let i = 0; i < route.length - 1; i++) {
          total += calculateNetworkDistance(route[i], route[i + 1])
        }
        total += calculateNetworkDistance(route[route.length - 1], depotId)
        return total
      }
      
      console.log(`   Running LKH algorithm on ${candidates.length} candidates...`)
      
      // Import LKH
      const { linKernighanHelsgaun } = await import('./algorithms/linKernighanHelsgaun.js')
      
      // Track ALL optimized routes
      const allRoutes = []
      
      for (let i = 0; i < candidates.length; i++) {
        if (i % 200 === 0 || i === candidates.length - 1) {
          console.log(`   → ${i + 1}/${candidates.length}`)
        }
        
        let sequence = candidates[i]
        
        // Apply Lin-Kernighan-Helsgaun algorithm
        // This is a variable-depth k-opt with candidate sets and don't-look bits
        sequence = linKernighanHelsgaun(sequence, depotId)
        
        const dist = calculateRouteDistance(sequence)
        allRoutes.push({ sequence: [...sequence], dist })
        
        // Additionally: Try with reversed initial tour (different starting topology)
        const reversedSequence = [...candidates[i]].reverse()
        const optimizedReversed = linKernighanHelsgaun(reversedSequence, depotId)
        const distReversed = calculateRouteDistance(optimizedReversed)
        allRoutes.push({ sequence: [...optimizedReversed], dist: distReversed })
      }
      
      console.log(`   ✓ ${allRoutes.length} optimized routes`)
      
      // Select best route
      allRoutes.sort((a, b) => a.dist - b.dist)
      const absoluteBest = allRoutes[0]
      
      console.log(`   🏆 Best route: ${absoluteBest.dist.toFixed(2)} km`)
      
      const optimizedSequence = absoluteBest.sequence
      const time2 = performance.now() - startTime2
      console.log(`   Time: ${(time2/1000).toFixed(1)}s`)
      
      // Phase 3: Map route to actual edges
      console.log('\n🗺️ Phase 3: Mapping to road network')
      const edgesForRoute = []
      let currentPos = depotId
      
      console.log(`   ${depotId} → ${optimizedSequence[0]}`)
      
      // Prüfe auch coincident nodes (überlappende Knoten) für Depot und Ziel
      const depotCluster = getCluster(depotId)
      const firstAddrCluster = getCluster(optimizedSequence[0])
      
      // Versuche direkte Edge zu finden (auch über coincident nodes)
      let firstEdge = null
      for (const depotNode of depotCluster) {
        for (const targetNode of firstAddrCluster) {
          firstEdge = tourSetup.edges.find(ed =>
            (ed.a === depotNode && ed.b === targetNode) ||
            (ed.b === depotNode && ed.a === targetNode)
          )
          if (firstEdge) break
        }
        if (firstEdge) break
      }
      
      if (firstEdge) {
        edgesForRoute.push(firstEdge)
        currentPos = optimizedSequence[0]
                console.log(`     ✓ Direct: ${firstEdge.id}`)
      } else {
        const depotJunction = depotCluster.find(id => nodesById[id]?.type === 'junction') || depotCluster[0]
        const targetJunction = firstAddrCluster.find(id => nodesById[id]?.type === 'junction') || firstAddrCluster[0]
        const path = findDetour(depotJunction, targetJunction, new Set())
        if (path && path.length > 0) {
          edgesForRoute.push(...path)
          currentPos = optimizedSequence[0]
          console.log(`     ✓ Via ${path.length} edges`)
        } else {
          console.error(`   ❌ No path found!`)
          setAutoRouteError(`Keine Route vom Depot zur ersten Adresse ${optimizedSequence[0]}`)
          setAutoGenerating(false)
          return
        }
      }
      
      // Zwischen allen Adressen
      for (let i = 1; i < optimizedSequence.length; i++) {
        const from = optimizedSequence[i - 1]
        const to = optimizedSequence[i]
        console.log(`   ${from} → ${to}`)
        
        // Prüfe auch coincident nodes
        const fromCluster = getCluster(from)
        const toCluster = getCluster(to)
        
        console.log(`   From Cluster: [${fromCluster.join(', ')}]`)
        console.log(`   To Cluster: [${toCluster.join(', ')}]`)
        
        let directEdge = null
        for (const fromNode of fromCluster) {
          for (const toNode of toCluster) {
            directEdge = tourSetup.edges.find(ed =>
              (ed.a === fromNode && ed.b === toNode) ||
              (ed.b === fromNode && ed.a === toNode)
            )
            if (directEdge) {
              console.log(`   Gefunden: ${fromNode} ↔ ${toNode} via ${directEdge.id}`)
              break
            }
          }
          if (directEdge) break
        }
        
        if (directEdge) {
          edgesForRoute.push(directEdge)
          currentPos = to
          console.log(`   ✓ Direkte Edge: ${directEdge.id} (${(directEdge.lengthKm || 0).toFixed(2)} km)${directEdge.blocked ? ' [BAUSTELLE]' : ''}`)
        } else {
          console.log(`   ⚠️ Keine direkte Edge → Dijkstra-Pathfinding...`)
          // Nutze Junction-Knoten für Pathfinding (nicht Adress-Knoten!)
          const fromJunction = fromCluster.find(id => nodesById[id]?.type === 'junction') || fromCluster[0]
          const toJunction = toCluster.find(id => nodesById[id]?.type === 'junction') || toCluster[0]
          console.log(`   Pathfinding: ${fromJunction} → ${toJunction}`)
          const path = findDetour(fromJunction, toJunction, new Set())
          if (path && path.length > 0) {
            edgesForRoute.push(...path)
            currentPos = to
            console.log(`     ✓ Via ${path.length} edges`)
          } else {
            console.error(`   ❌ No path: ${from} → ${to}`)
          }
        }
      }
      
      console.log(`   ${currentPos} → ${depotId}`)
      
      const lastCluster = getCluster(currentPos)
      const depotReturnCluster = getCluster(depotId)
      
      let returnEdge = null
      for (const fromNode of lastCluster) {
        for (const depotNode of depotReturnCluster) {
          returnEdge = tourSetup.edges.find(ed =>
            (ed.a === fromNode && ed.b === depotNode) ||
            (ed.b === fromNode && ed.a === depotNode)
          )
          if (returnEdge) break
        }
        if (returnEdge) break
      }
      
      if (returnEdge) {
        edgesForRoute.push(returnEdge)
                console.log(`     ✓ Direct: ${returnEdge.id}`)
      } else {
        console.log(`   ⚠️ Keine direkte Edge → Dijkstra-Pathfinding...`)
        const fromJunction = lastCluster.find(id => nodesById[id]?.type === 'junction') || lastCluster[0]
        const depotJunction = depotReturnCluster.find(id => nodesById[id]?.type === 'junction') || depotReturnCluster[0]
        console.log(`   Pathfinding: ${fromJunction} → ${depotJunction}`)
        const path = findDetour(fromJunction, depotJunction, new Set())
        if (path && path.length > 0) {
          edgesForRoute.push(...path)
          const totalDist = path.reduce((sum, e) => sum + (e.lengthKm || 0), 0)
          console.log(`   ✓ Umweg über ${path.length} Edges (${totalDist.toFixed(2)} km)`)
          console.log(`   Path: ${path.map(e => e.id).join(' → ')}`)
        } else {
          console.error(`   ❌ FEHLER: Keine Rückroute zum Depot!`)
        }
      }
      
      // Phase 4: Track visited addresses
      const visited = new Set(optimizedSequence)
      console.log(`\n✓ Route visits ${visited.size} addresses`)
      
      // Remove duplicate edges
      const uniqueEdges = []
      const seenEdgeIds = new Set()
      edgesForRoute.forEach(edge => {
        if (!seenEdgeIds.has(edge.id)) {
          seenEdgeIds.add(edge.id)
          uniqueEdges.push(edge)
        }
      })
      
      console.log(`\n✓ Generated ${uniqueEdges.length} edge route`)
      
      let totalKm = 0
      uniqueEdges.forEach(edge => {
        const a = nodesById[edge.a]
        const b = nodesById[edge.b]
        if (a && b) {
          const lengthKm = edge.lengthKm || (Math.hypot(b.x - a.x, b.y - a.y) * 0.01)
          totalKm += lengthKm
        }
      })
      
      const stopTimeMin = visited.size * 8
      const driveTimeMin = (totalKm / 30) * 60
      const totalTimeMin = stopTimeMin + driveTimeMin
      
      const baselineKm = 27.00
      const targetKm = 25.00
      
      console.log(`\n   Gesamtstrecke: ${totalKm.toFixed(2)} km`)
      console.log(`   Baseline: ${baselineKm.toFixed(2)} km`)
      console.log(`   Ziel: ≤ ${targetKm.toFixed(2)} km`)
      
      const improvement = baselineKm - totalKm
      const improvementPct = (improvement / baselineKm * 100)
      
      if (totalKm <= targetKm) {
        console.log(`   ✅ ZIEL ERREICHT! ${improvement.toFixed(2)} km besser als Baseline (${improvementPct.toFixed(1)}%)`)
      } else {
        console.log(`   ⚠️ Ziel nicht erreicht: ${(totalKm - targetKm).toFixed(2)} km über Ziel`)
        console.log(`   📊 Verbesserung vs Baseline: ${improvement.toFixed(2)} km (${improvementPct.toFixed(1)}%)`)
      }
      console.log(`   Fahrzeit: ${driveTimeMin.toFixed(0)} min`)
      console.log(`   Stopzeit: ${stopTimeMin} min (${visited.size} × 8 min)`)
      console.log(`   Gesamtzeit: ${totalTimeMin.toFixed(0)} min`)
      console.log(`   Total Edges: ${uniqueEdges.length}`)
      
      // PHASE 6: States setzen
      console.log('\n💾 PHASE 6: STATES AKTUALISIEREN')
      console.log('─────────────────────────────────────')
      
      const edgeIds = uniqueEdges.map(e => e.id)
      console.log(`   Edge IDs für Karte: [${edgeIds.join(', ')}]`)
      
      setAutoRouteEdges(uniqueEdges)
      setSelectedEdgeIds(edgeIds)
      setVisitedAddresses(visited)
      setCurrentEndNode(depotId)
      setAutoRouteGenerated(true)
      setAutoGenerating(false)
      
      console.log(`   ✓ ${uniqueEdges.length} Edges gespeichert`)
      console.log(`   ✓ ${edgeIds.length} Edge IDs gesetzt`)
      console.log(`   ✓ ${visited.size}/18 Adressen besucht`)
      
      if (visited.size < 18) {
        const missing = 18 - visited.size
        console.warn(`\n⚠️ WARNUNG: Nur ${visited.size}/18 Adressen (${missing} fehlen)`)
        setAutoRouteError(`Achtung: ${missing} Adresse(n) nicht erreichbar.`)
      }
      
      console.log('\n═══════════════════════════════════════')
      console.log('✅ ROUTENGENERIERUNG ABGESCHLOSSEN')
      console.log('═══════════════════════════════════════\n')
      
    } catch (error) {
      console.error('\n❌ KRITISCHER FEHLER:', error)
      setAutoRouteError('Unerwarteter Fehler bei der Routengenerierung.')
      setAutoGenerating(false)
    }
  }

  function resetAutoRoute() {
    setAutoRouteGenerated(false)
    setAutoRouteEdges([])
    setSelectedEdgeIds([])
    setVisitedAddresses(new Set())
    setCurrentEndNode(null)
    setAutoRouteError(null)
    console.log('🔄 Auto-Route zurückgesetzt')
  }

  function runSimulation() {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (!vehicle) { 
      alert('Bitte Fahrzeug wählen.')
      return 
    }
    
    let edgesForSim = []
    
    if (mode === 'manual') {
      edgesForSim = manualEdges
    } else if (mode === 'auto') {
      if (!autoRouteGenerated) {
        alert('Bitte zuerst Route generieren.')
        return
      }
      edgesForSim = autoRouteEdges
    }
    
    if (edgesForSim.length === 0) {
      alert('Keine Route vorhanden.')
      return
    }
    
    console.log(`🚚 Starte Simulation mit ${edgesForSim.length} Edges (Modus: ${mode})`)
    const res = simulateRoute(edgesForSim, vehicle, tourSetup, baseline)
    setPlannedRoute(edgesForSim)
    setReport(res)
    setPhase('report')
  }

  return (
    <div className="container">
      {phase === 'intro' && (
        <div className="panel">
          <h1>Lernstufe 3: Technologische Unterstützung bei der Planung</h1>
          <div className="story-text">
            <p>
              Mehrere Kunden haben positiv auf das neue Fahrzeug reagiert. Doch eine Disponentin berichtet besorgt, 
              dass in der Tagespresse umfangreiche Baustellen im Stadtgebiet angekündigt wurden.
            </p>
            <p>
              Sie befürchtet, dass Lieferungen nicht mehr innerhalb der vorgesehenen Zeitfenster erfolgen können. 
              Die Geschäftsführerin beschließt, nach einer Routenplanungssoftware zu suchen, die solche 
              Hindernisse automatisch berücksichtigt.
            </p>
            <p>
              <strong>Aufgabe:</strong> Planen Sie eine Tour für 18 Kunden im dreistündigen Zustellfenster (07:00-10:00 Uhr). 
              Entscheiden Sie, ob Sie die Software einsetzen oder weiterhin manuell planen möchten.
            </p>
            <div className="baseline-box">
              <h4>Ausgangswerte (Baseline):</h4>
              <ul>
                <li>Zustellquote: {(baseline.deliveryRate * 100).toFixed(1)}%</li>
                <li>Gesamtdistanz: {baseline.totalDistance} km</li>
                <li>Gesamtkosten: {baseline.totalCost.toFixed(2)} €</li>
                <li>CO₂-Emissionen: {baseline.co2Emissions.toFixed(3)} kg</li>
              </ul>
            </div>
          </div>
          <button className="button primary" onClick={() => setPhase('select')}>Lernstufe starten</button>
        </div>
      )}

      {phase === 'select' && (
        <div className="panel">
          <h2>Fahrzeug wählen</h2>
          <VehicleSelector vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
          <h2>Planungsmodus</h2>
          <ModeSelector value={mode} onChange={setMode} />
          <button
            className="button"
            onClick={() => setPhase('plan')}
            disabled={!vehicleId || !mode}
          >
            Zur Planung
          </button>
        </div>
      )}

      {phase === 'plan' && mode === 'manual' && (() => {
        const allAddressesVisited = visitedAddresses.size === 18
        const isBackAtDepot = currentEndNode
          ? getCluster(currentEndNode).some(id => startAnchorIds.includes(id))
          : false
        const canStartSimulation = allAddressesVisited && isBackAtDepot

        return (
          <div className="panel">
            <h2>Route planen (manuell)</h2>
            <p>Klicken Sie Kanten nacheinander; die erste muss am Depot starten.</p>
            
            {mode === 'manual' && (
              <>
                <div style={{ 
                  padding: '12px', 
                  marginBottom: '16px', 
                  background: allAddressesVisited && isBackAtDepot ? '#d1fae5' : '#fef3c7',
                  border: `2px solid ${allAddressesVisited && isBackAtDepot ? '#10b981' : '#f59e0b'}`,
                  borderRadius: '8px'
                }}>
                  <strong>Fortschritt:</strong>
                  <div style={{ marginTop: '8px' }}>
                    📍 Besuchte Adressen: <strong>{visitedAddresses.size}/18</strong>
                    {visitedAddresses.size < 18 && ' (noch nicht alle Adressen besucht)'}
                  </div>
                  {visitedAddresses.size === 18 && currentEndNode !== depotId && (
                    <div style={{ marginTop: '4px', color: '#d97706' }}>
                      ⚠️ Zurück zum Depot fahren erforderlich
                    </div>
                  )}
                  {allAddressesVisited && isBackAtDepot && (
                    <div style={{ marginTop: '4px', color: '#059669' }}>
                      ✓ Route vollständig - bereit für Simulation
                    </div>
                  )}
                </div>
                
                {manualEdges.length > 0 && (() => {
                  // Berechne Gesamtkilometer und Fahrzeit
                  const nodesById = {}
                  tourSetup.nodes.forEach(n => { nodesById[n.id] = n })
                  
                  let totalKm = 0
                  manualEdges.forEach(edge => {
                    const a = nodesById[edge.a]
                    const b = nodesById[edge.b]
                    if (a && b) {
                      const lengthKm = edge.lengthKm || (Math.hypot(b.x - a.x, b.y - a.y) * 0.01)
                      totalKm += lengthKm
                    }
                  })
                  
                  const totalTimeMin = (totalKm / 30) * 60 + (visitedAddresses.size * 8) // 30 km/h + 8 min pro Adresse
                  const hours = Math.floor(totalTimeMin / 60)
                  const minutes = Math.round(totalTimeMin % 60)
                  
                  return (
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      marginBottom: '16px' 
                    }}>
                      <div style={{ 
                        flex: 1,
                        padding: '12px', 
                        background: '#eff6ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '4px' }}>
                          Gesamtstrecke
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
                          {totalKm.toFixed(2)} km
                        </div>
                      </div>
                      <div style={{ 
                        flex: 1,
                        padding: '12px', 
                        background: '#f0fdf4',
                        border: '2px solid #10b981',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '13px', color: '#065f46', marginBottom: '4px' }}>
                          Geschätzte Dauer
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#065f46' }}>
                          {hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
            
            <MapView
              tourData={tourSetup}
              mode={mode}
              selectedEdgeIds={selectedEdgeIds}
              visitedAddresses={visitedAddresses}
              currentNode={currentEndNode}
              onSelectEdge={handleEdgeSelect}
            />
            {mode === 'manual' && selectionMessage && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #f97316',
                  background: 'rgba(251, 191, 36, 0.15)',
                  color: '#9a3412'
                }}
              >
                ⚠️ {selectionMessage}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="button primary"
                onClick={runSimulation}
                disabled={!canStartSimulation}
                title={!canStartSimulation ? 'Alle 18 Adressen müssen besucht werden und Route muss zum Depot zurückführen' : ''}
              >
                Simulation starten
              </button>
              {mode === 'manual' && manualEdges.length > 0 && (
                <>
                  <button
                    className="button"
                    onClick={undoLastEdge}
                    title="Letzte Kante entfernen"
                  >
                    ↶ Rückgängig
                  </button>
                  <button
                    className="button"
                    onClick={resetRoute}
                  >
                    Route zurücksetzen
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {phase === 'plan' && mode === 'auto' && (() => {
        return (
          <div className="panel">
            <h2>Route planen (automatisch)</h2>
            <p>Klicken Sie auf "Route generieren", um die optimale Route mit der Routenplanungssoftware (Nearest Insertion + 2-Opt) zu berechnen.</p>
            
            {!autoRouteGenerated && !autoGenerating && (
              <button 
                className="button primary"
                onClick={generateAutoRoute}
                style={{ marginBottom: '16px' }}
              >
                🔄 Route generieren
              </button>
            )}
            
            {autoGenerating && (
              <div style={{
                padding: '16px',
                background: '#eff6ff',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                  🔄 Berechne optimale Route...
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Nearest Insertion + 2-Opt Optimierung läuft
                </div>
              </div>
            )}
            
            {autoRouteError && (
              <div style={{
                padding: '12px',
                background: '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                marginBottom: '16px',
                color: '#991b1b'
              }}>
                ⚠️ {autoRouteError}
              </div>
            )}
            
            {autoRouteGenerated && (
              <div style={{
                padding: '12px',
                marginBottom: '16px',
                background: visitedAddresses.size === 18 ? '#d1fae5' : '#fef3c7',
                border: `2px solid ${visitedAddresses.size === 18 ? '#10b981' : '#f59e0b'}`,
                borderRadius: '8px'
              }}>
                <strong>Fortschritt:</strong>
                <div style={{ marginTop: '8px' }}>
                  📍 Besuchte Adressen: <strong>{visitedAddresses.size}/18</strong>
                </div>
                {visitedAddresses.size === 18 && (
                  <div style={{ marginTop: '4px', color: '#059669' }}>
                    ✓ Route vollständig - bereit für Simulation
                  </div>
                )}
              </div>
            )}
            
            {autoRouteGenerated && autoRouteEdges.length > 0 && (() => {
              let totalKm = 0
              autoRouteEdges.forEach(edge => {
                const a = nodesById[edge.a]
                const b = nodesById[edge.b]
                if (a && b) {
                  const lengthKm = edge.lengthKm || (Math.hypot(b.x - a.x, b.y - a.y) * 0.01)
                  totalKm += lengthKm
                }
              })
              
              const totalTimeMin = (totalKm / 30) * 60 + (visitedAddresses.size * 5)
              const hours = Math.floor(totalTimeMin / 60)
              const minutes = Math.round(totalTimeMin % 60)
              
              return (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    flex: 1,
                    padding: '12px',
                    background: '#eff6ff',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '4px' }}>
                      Gesamtstrecke
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
                      {totalKm.toFixed(2)} km
                    </div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f0fdf4',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '13px', color: '#065f46', marginBottom: '4px' }}>
                      Geschätzte Dauer
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#065f46' }}>
                      {hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`}
                    </div>
                  </div>
                </div>
              )
            })()}
            
            <MapView
              tourData={tourSetup}
              mode="view"
              selectedEdgeIds={selectedEdgeIds}
              visitedAddresses={new Set()}
              currentNode={null}
              onSelectEdge={() => {}}
              detours={[]}
            />
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="button primary"
                onClick={runSimulation}
                disabled={!autoRouteGenerated || autoGenerating}
              >
                Simulation starten
              </button>
              
              {autoRouteGenerated && (
                <button
                  className="button"
                  onClick={resetAutoRoute}
                >
                  Route zurücksetzen
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {phase === 'report' && report && (
        <div className="panel">
          <ESGDashboard baseline={baseline} results={report} />
          
          <div className="report-section" style={{ marginTop: '24px' }}>
            <h4>Ihre geplante Route</h4>
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              marginBottom: '12px', 
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '4px', background: '#3b82f6' }}></div>
                <span>Geplante Route</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '20px', height: '3px', background: '#dc2626', borderTop: '3px dashed #dc2626' }}></div>
                <span>Baustelle</span>
              </div>
              {report.detours && report.detours.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '20px', height: '4px', background: '#f59e0b' }}></div>
                  <span>Umfahrung</span>
                </div>
              )}
            </div>
            <MapView
              tourData={tourSetup}
              mode="view"
              selectedEdgeIds={selectedEdgeIds}
              visitedAddresses={new Set()}
              currentNode={null}
              onSelectEdge={() => {}}
              detours={report.detours || []}
            />
          </div>
          
          <div className="button-group">
            <button className="button secondary" onClick={() => window.location.reload()}>Neu starten</button>
            {report.passed && (
              <button className="button primary">Weiter zu Lernstufe 4</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

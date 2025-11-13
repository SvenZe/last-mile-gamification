import React, { useState, useMemo } from 'react'
import tourSetup from './data/tourSetup.json'
import baselineMetrics from './data/baselineMetrics.json'
import { vehicles } from './data/vehicles.js'
import MapView from './map/MapView.jsx'
import { nearestInsertion, twoOpt, simulateRoute } from './game/GameManager.js'
import { findDetour } from './algorithms/pathfinding.js'
import VehicleSelector from './components/VehicleSelector.jsx'
import ModeSelector from './components/ModeSelector.jsx'
import ESGDashboard from './components/ESGDashboard.jsx'

/**
 * Main application component for the Last-Mile Gamification serious game.
 * 
 * This is a learning game about route planning in last-mile logistics.
 * Players can either plan routes manually by clicking on edges, or let
 * an algorithm do it automatically. The game evaluates routes based on
 * ESG criteria (Environment, Economy, Social).
 * 
 * Game phases:
 * - intro: Story introduction and baseline metrics
 * - select: Choose vehicle and planning mode (manual/auto)
 * - plan: Create the route (interactive or algorithmic)
 * - report: View results and ESG scores
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

  function runSimulation() {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (!vehicle) { alert('Bitte Fahrzeug wählen.'); return }
    let edgesForSim = []

    if (mode === 'manual') {
      edgesForSim = manualEdges
    } else {
      // Auto: Adresse-Reihenfolge mit Heuristik bestimmen
      const seq = twoOpt(nearestInsertion(tourSetup))
      edgesForSim = []
      let last = depotId
      
      seq.forEach(addrId => {
        // Try to find a direct edge first
        const directEdge = tourSetup.edges.find(ed =>
          (ed.a === last && ed.b === addrId) || (ed.b === last && ed.a === addrId))
        
        if (directEdge) {
          edgesForSim.push(directEdge)
        } else {
          // No direct edge - find path through junctions
          const path = findDetour(last, addrId, new Set())
          if (path && path.length > 0) {
            edgesForSim.push(...path)
          }
        }
        last = addrId
      })
      
      // Return to depot
      const backEdge = tourSetup.edges.find(ed =>
        (ed.a === last && ed.b === depotId) || (ed.b === last && ed.a === depotId))
      if (backEdge) {
        edgesForSim.push(backEdge)
      } else {
        const returnPath = findDetour(last, depotId, new Set())
        if (returnPath && returnPath.length > 0) {
          edgesForSim.push(...returnPath)
        }
      }
      
      setSelectedEdgeIds(edgesForSim.map(e => e.id))  // Array statt Set
    }

    const res = simulateRoute(edgesForSim, vehicle, tourSetup, baseline)
    setPlannedRoute(edgesForSim)  // Save the planned route before simulation
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
            Weiter zur Planung
          </button>
        </div>
      )}

      {phase === 'plan' && (() => {
        const allAddressesVisited = visitedAddresses.size === 18
        const isBackAtDepot = currentEndNode
          ? getCluster(currentEndNode).some(id => startAnchorIds.includes(id))
          : false
        const canStartSimulation = mode === 'auto' || (allAddressesVisited && isBackAtDepot)

        return (
          <div className="panel">
            <h2>Route planen ({mode === 'manual' ? 'manuell' : 'automatisch'})</h2>
            <p>{mode === 'manual'
              ? 'Klicken Sie Kanten nacheinander; die erste muss am Depot starten.'
              : 'Automatische Tour wird im Hintergrund erzeugt.'}</p>
            
            {mode === 'manual' && (
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

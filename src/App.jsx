import React, { useState } from 'react'
import tourSetup from './data/tourSetup.json'
import baselineMetrics from './data/baselineMetrics.json'
import { vehicles } from './data/vehicles.js'
import MapView from './map/MapView.jsx'
import { nearestInsertion, twoOpt, simulateRoute } from './game/GameManager.js'
import VehicleSelector from './components/VehicleSelector.jsx'
import ModeSelector from './components/ModeSelector.jsx'
import ESGDashboard from './components/ESGDashboard.jsx'

export default function App() {
  const [phase, setPhase] = useState('intro')
  const [vehicleId, setVehicleId] = useState(null)
  const [mode, setMode] = useState(null)
  const [manualEdges, setManualEdges] = useState([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState(new Set())
  const [report, setReport] = useState(null)

  const baseline = baselineMetrics.level3
  const depotId = tourSetup.nodes.find(n => n.type === 'depot')?.id

  function handleEdgeSelect(edge) {
    if (mode !== 'manual') return
    if (!depotId) return
    if (manualEdges.length === 0) {
      if (edge.a !== depotId && edge.b !== depotId) return
      setManualEdges([edge])
      setSelectedEdgeIds(new Set([edge.id]))
    } else {
      const last = manualEdges[manualEdges.length - 1]
      const lastEnd = last.b
      if (edge.a === lastEnd || edge.b === lastEnd) {
        const next = [...manualEdges, edge]
        setManualEdges(next)
        setSelectedEdgeIds(new Set([...selectedEdgeIds, edge.id]))
      }
    }
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
        const e = tourSetup.edges.find(ed =>
          (ed.a === last && ed.b === addrId) || (ed.b === last && ed.a === addrId))
        if (e) edgesForSim.push(e)
        last = addrId
      })
      const back = tourSetup.edges.find(ed =>
        (ed.a === last && ed.b === depotId) || (ed.b === last && ed.a === depotId))
      if (back) edgesForSim.push(back)
      setSelectedEdgeIds(new Set(edgesForSim.map(e => e.id)))
    }

    const res = simulateRoute(edgesForSim, vehicle, tourSetup, baseline)
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
            onClick={() => { setManualEdges([]); setSelectedEdgeIds(new Set()); setPhase('plan') }}
            disabled={!vehicleId || !mode}
          >
            Weiter zur Planung
          </button>
        </div>
      )}

      {phase === 'plan' && (
        <div className="panel">
          <h2>Route planen ({mode === 'manual' ? 'manuell' : 'automatisch'})</h2>
          <p>{mode === 'manual'
            ? 'Klicken Sie Kanten nacheinander; die erste muss am Depot starten.'
            : 'Automatische Tour wird im Hintergrund erzeugt.'}</p>
          <MapView
            tourData={tourSetup}
            mode={mode}
            selectedEdgeIds={selectedEdgeIds}
            onSelectEdge={handleEdgeSelect}
          />
          <button
            className="button"
            onClick={runSimulation}
            disabled={mode === 'manual' && manualEdges.length === 0}
          >
            Simulation starten
          </button>
        </div>
      )}

      {phase === 'report' && report && (
        <div className="panel">
          <ESGDashboard baseline={baseline} results={report} />
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

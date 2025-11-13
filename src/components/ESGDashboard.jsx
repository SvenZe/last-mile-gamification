import React from 'react'

const f = (n, d=2) => n.toFixed(d)

function DeltaIndicator({ value, isImprovement }) {
  if (Math.abs(value) < 0.01) {
    return <span className="delta neutral">→</span>
  }
  return (
    <span className={`delta ${isImprovement ? 'positive' : 'negative'}`}>
      {isImprovement ? '▲' : '▼'} {f(Math.abs(value), 2)}
    </span>
  )
}

export default function ESGDashboard({ baseline, results }) {
  const baselinePct = baseline.deliveryRate * 100
  
  return (
    <div className="report">
      <h3 className="report-title">ESG-Bericht: Lernstufe 3</h3>
      
      {results.passed ? (
        <div className="success-message">
          ✓ Lernstufe erfolgreich abgeschlossen! ESG-Score: {f(results.esgScore, 1)} Punkte
        </div>
      ) : (
        <div className="warning-message">
          ⚠ Keine Verbesserung erzielt. ESG-Score: {f(results.esgScore, 1)} Punkte
        </div>
      )}

      <div className="report-section">
        <h4>Ökologie (40% Gewichtung)</h4>
        <div className="report-row">
          <span>CO₂-Emissionen</span>
          <span>
            {f(results.co2Kg, 3)} kg
            <DeltaIndicator value={results.co2Delta} isImprovement={results.co2Delta > 0} />
          </span>
        </div>
        <div className="report-row">
          <span>Baseline CO₂</span>
          <span>{f(baseline.co2Emissions, 3)} kg</span>
        </div>
        <div className="report-row points">
          <span>Ökologie-Punkte</span>
          <span className={results.co2Pts >= 0 ? 'positive' : 'negative'}>
            {results.co2Pts > 0 ? '+' : ''}{results.co2Pts}
          </span>
        </div>
      </div>

      <div className="report-section">
        <h4>Ökonomie (35% Gewichtung)</h4>
        <div className="report-row">
          <span>Kosten pro km (Basis)</span>
          <span>{f(results.costPerKmBasis, 2)} €/km</span>
        </div>
        <div className="report-row" style={{ paddingLeft: '20px', fontSize: '0.85em', color: '#94a3b8' }}>
          <span>→ Fixkosten (Miete + Gehälter)</span>
          <span>{f(results.fixedCostPerKm, 2)} €/km</span>
        </div>
        <div className="report-row" style={{ paddingLeft: '20px', fontSize: '0.85em', color: '#94a3b8' }}>
          <span>→ Variable Kosten (Fahrzeug)</span>
          <span>{f(results.variableCostPerKm, 2)} €/km</span>
        </div>
        
        <div className="report-row" style={{ marginTop: '12px', fontWeight: 'bold' }}>
          <span>Gesamtkosten Tour (kTour)</span>
          <span>
            {f(results.totalCost, 2)} €
            <DeltaIndicator value={results.costDelta} isImprovement={results.costDelta > 0} />
          </span>
        </div>
        <div className="report-row" style={{ paddingLeft: '20px', fontSize: '0.9em', color: '#64748b' }}>
          <span>Fixkosten (kFix = {f(results.fixedCostPerKm, 2)} × {f(results.totalKm, 2)} km)</span>
          <span>{f(results.kFix, 2)} €</span>
        </div>
        <div className="report-row" style={{ paddingLeft: '20px', fontSize: '0.9em', color: '#64748b' }}>
          <span>Variable Kosten (kVar = {f(results.variableCostPerKm, 2)} × {f(results.totalKm, 2)} km)</span>
          <span>{f(results.kVar, 2)} €</span>
        </div>
        <div className="report-row">
          <span>Baseline Kosten</span>
          <span>{f(baseline.totalCost, 2)} €</span>
        </div>
        <div className="report-row">
          <span>Distanz</span>
          <span>{f(results.totalKm, 2)} km (Baseline: {baseline.totalDistance} km)</span>
        </div>
        <div className="report-row">
          <span>Kosten / Stopp (kStopp)</span>
          <span>{f(results.costPerStop, 2)} €</span>
        </div>
        <div className="report-row">
          <span>Kosten / erfolg. Zustellung (kErstversuch)</span>
          <span>{f(results.costPerSuccess, 2)} €</span>
        </div>
        <div className="report-row points">
          <span>Ökonomie-Punkte</span>
          <span className={results.costPts >= 0 ? 'positive' : 'negative'}>
            {results.costPts > 0 ? '+' : ''}{results.costPts}
          </span>
        </div>
      </div>

      <div className="report-section">
        <h4>Soziales (25% Gewichtung)</h4>
        <div className="report-row">
          <span>Zustellquote</span>
          <span>
            {f(results.deliveryRate, 1)}%
            <DeltaIndicator value={results.deliveryDelta} isImprovement={results.deliveryDelta > 0} />
          </span>
        </div>
        <div className="report-row">
          <span>Baseline Zustellquote</span>
          <span>{f(baselinePct, 1)}%</span>
        </div>
        <div className="report-row">
          <span>Anzahl Stopps</span>
          <span>{results.numberOfStops}</span>
        </div>
        {results.constructionDelays > 0 && (
          <div className="report-row warning">
            <span>⚠ Baustellen durchfahren</span>
            <span>{results.constructionDelays}</span>
          </div>
        )}
        <div className="report-row points">
          <span>Sozial-Punkte</span>
          <span className={results.deliveryPts >= 0 ? 'positive' : 'negative'}>
            {results.deliveryPts > 0 ? '+' : ''}{results.deliveryPts}
          </span>
        </div>
      </div>

      <div className="report-total">
        <div className="report-row">
          <span><strong>Gesamt ESG-Score</strong></span>
          <span className={results.passed ? 'success' : 'warning'}>
            <strong>{f(results.esgScore, 1)} Punkte</strong>
          </span>
        </div>
      </div>

      <div className="report-info">
        <p>
          {results.passed 
            ? 'Glückwunsch! Sie haben die Ausgangswerte verbessert und die Lernstufe erfolgreich abgeschlossen.'
            : 'Die Gesamtbilanz ist nicht positiv. Versuchen Sie eine andere Strategie oder Fahrzeugwahl.'}
        </p>
        {results.constructionDelays > 0 && (
          <p className="tip">
            💡 Tipp: Mit der Routenplanungssoftware können Baustellen automatisch umfahren werden.
          </p>
        )}
      </div>
    </div>
  )
}

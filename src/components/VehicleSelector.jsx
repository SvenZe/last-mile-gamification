import React from 'react'

export default function VehicleSelector({ vehicles, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      {vehicles.map(v => (
        <button
          key={v.id}
          className="button"
          style={{ 
            backgroundColor: v.id === value ? '#7dd3fc' : '#f1f5f9',
            border: v.id === value ? '2px solid #0284c7' : '2px solid #cbd5e1',
            padding: '12px 16px',
            borderRadius: '8px',
            textAlign: 'left',
            cursor: 'pointer',
            flex: '1 1 280px',
            minWidth: '280px',
            color: '#1e293b'
          }}
          onClick={() => onChange(v.id)}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '16px', color: '#0f172a' }}>
            {v.name}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            lineHeight: '1.8', 
            color: '#0f172a',
            marginBottom: '10px',
            paddingBottom: '10px',
            borderBottom: '1px solid #cbd5e1'
          }}>
            <div><strong>Abschreibung pro Jahr:</strong> {v.depreciationPerYear.toLocaleString('de-DE')} €</div>
            <div><strong>Versicherung pro Jahr:</strong> {v.insurancePerYear.toLocaleString('de-DE')} €</div>
            <div><strong>Steuern pro Jahr:</strong> {v.taxPerYear.toLocaleString('de-DE')} €</div>
          </div>
          
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#475569', marginBottom: '10px' }}>
            {v.fuelConsumption && (
              <div>
                <strong>{v.fuelType}verbrauch:</strong> {v.fuelConsumption.toLocaleString('de-DE')} {v.fuelUnit} / 100 km
                <span style={{ marginLeft: '8px', color: '#64748b' }}>({v.fuelPrice.toLocaleString('de-DE')} € / {v.fuelUnit})</span>
              </div>
            )}
            {v.electricConsumption && (
              <div>
                <strong>Stromverbrauch:</strong> {v.electricConsumption.toLocaleString('de-DE')} kWh / 100 km
                <span style={{ marginLeft: '8px', color: '#64748b' }}>({v.electricPrice.toLocaleString('de-DE')} € / kWh)</span>
              </div>
            )}
          </div>
          
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#475569' }}>
            <div>Kosten pro km: <strong>{v.costPerKm.toFixed(2)} €</strong></div>
            <div>CO₂-Verbrauch / km: <strong>{v.co2PerKm.toFixed(3)} kg</strong></div>
            <div>Kapazität: <strong>{v.capacityM3} m³</strong> (max. Kisten: <strong>{v.maxBoxes}</strong>)</div>
          </div>
        </button>
      ))}
    </div>
  )
}

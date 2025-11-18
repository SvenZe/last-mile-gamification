/**
 * ModeSelector.jsx
 * Lets the player choose between manual and automatic route planning.
 */

import React from 'react'

export default function ModeSelector({ value, onChange }) {
  // Define available planning modes with their descriptions
  const modes = [
    {
      id: 'manual',
      title: 'Manuelle Planung',
      description: 'Plane deine Route selbst. Die angezeigten Streckenzeiten sind Schätzwerte und passen sich nicht an die aktuelle Verkehrslage an. Baustellen und Staus sind nicht sichtbar.'
    },
    {
      id: 'auto',
      title: 'Automatische Planung',
      description: 'Algorithmus berechnet die optimale Route unter Berücksichtigung von Echtzeit-Verkehrsdaten, Baustellen und Staus. Software-Kosten: 5.000 €'
    }
  ]

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      {/* Render each mode as a selectable card */}
      {modes.map(mode => (
        <button
          key={mode.id}
          className="button"
          style={{ 
            backgroundColor: value === mode.id ? '#7dd3fc' : '#f1f5f9',
            border: value === mode.id ? '2px solid #0284c7' : '2px solid #cbd5e1',
            padding: '16px 20px',
            borderRadius: '8px',
            textAlign: 'left',
            cursor: 'pointer',
            flex: '1 1 280px',
            minWidth: '280px',
            color: '#1e293b'
          }}
          onClick={() => onChange(mode.id)}
        >
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a', marginBottom: '8px' }}>
            {mode.title}
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#64748b' }}>
            {mode.description}
          </div>
        </button>
      ))}
    </div>
  )
}

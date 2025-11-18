import React from 'react'

/**
 * MapLegend - Legend component for route adjustment mode
 * 
 * Displays instructions for stop reordering and color legend
 */
export default function MapLegend({ selectedStop, onStopReorder, stopSequence }) {
  if (!onStopReorder || !stopSequence) {
    return null
  }

  return (
    <div style={{ 
      marginTop: '12px', 
      padding: '10px', 
      background: '#f1f5f9', 
      borderRadius: '6px', 
      fontSize: '13px' 
    }}>
      <div style={{ fontWeight: '600', marginBottom: '6px', color: '#475569' }}>
        Reihenfolge auf der Karte ändern:
      </div>
      <div style={{ color: '#64748b', fontSize: '12px' }}>
        {selectedStop ? (
          <>
            <span style={{ color: '#f59e0b', fontWeight: '600' }}>Stopp ausgewählt</span> - Klicken Sie auf einen anderen Stopp zum Tauschen
          </>
        ) : (
          <>
            Klicken Sie auf zwei Stopps nacheinander, um sie zu tauschen
          </>
        )}
      </div>
      <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
        <span style={{ color: '#10b981' }}>●</span> Grün = Im Zeitfenster &nbsp;
        <span style={{ color: '#dc2626' }}>●</span> Rot = Verspätet
      </div>
    </div>
  )
}

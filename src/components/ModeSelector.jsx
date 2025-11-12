import React from 'react'

export default function ModeSelector({ value, onChange }) {
  return (
    <div className="selector">
      <button
        className="button"
        style={{ backgroundColor: value === 'manual' ? '#7dd3fc' : undefined }}
        onClick={() => onChange('manual')}
      >Manuell</button>
      <button
        className="button"
        style={{ backgroundColor: value === 'auto' ? '#7dd3fc' : undefined }}
        onClick={() => onChange('auto')}
      >Automatisch</button>
    </div>
  )
}

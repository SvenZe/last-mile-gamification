import React from 'react'

export default function VehicleSelector({ vehicles, value, onChange }) {
  return (
    <div className="selector">
      {vehicles.map(v => (
        <button
          key={v.id}
          className="button"
          style={{ backgroundColor: v.id === value ? '#7dd3fc' : undefined }}
          onClick={() => onChange(v.id)}
        >
          {v.name}
        </button>
      ))}
    </div>
  )
}

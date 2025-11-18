/**
 * TrafficTimeSlider.jsx
 * Slider to preview traffic at different times (7:00-10:00 AM).
 * Shows in 15-minute steps.
 */

import React from 'react'

export default function TrafficTimeSlider({ currentTime, onChange, disabled = false }) {
  // Convert minutes offset to clock time (7:00-10:00)
  const formatTime = (minutes) => {
    const hours = 7 + Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }
  
  // Generate tick marks at 30-minute intervals
  const ticks = []
  for (let i = 0; i <= 180; i += 30) {
    ticks.push(i)
  }
  
  return (
    <div style={{
      padding: '16px',
      background: '#1e293b',
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <label style={{ 
          fontWeight: 'bold', 
          color: '#ffffff',
          fontSize: '14px'
        }}>
          Verkehrssimulation
        </label>
        <span style={{ 
          color: '#fbbf24', 
          fontWeight: 'bold',
          fontSize: '18px'
        }}>
          {formatTime(currentTime)} Uhr
        </span>
      </div>
      
      <div style={{ position: 'relative' }}>
        {/* Range slider from 0-180 minutes in 15-minute steps */}
        <input
          type="range"
          min="0"
          max="180"
          step="15"
          value={currentTime}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: 'linear-gradient(to right, #10b981 0%, #f59e0b 30%, #ef4444 50%, #f59e0b 70%, #10b981 100%)',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1
          }}
        />
        
        {/* Time markers */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '11px',
          color: '#94a3b8'
        }}>
          {ticks.map(tick => (
            <span key={tick}>{formatTime(tick)}</span>
          ))}
        </div>
      </div>
      
      {/* Traffic legend */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginTop: '12px',
        fontSize: '12px',
        color: '#cbd5e1'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: '#ffffff', borderRadius: '2px' }}></div>
          <span>Normal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: '#f59e0b', borderRadius: '2px' }}></div>
          <span>Erhöht</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '16px', background: '#ef4444', borderRadius: '2px' }}></div>
          <span>Stark</span>
        </div>
      </div>
    </div>
  )
}

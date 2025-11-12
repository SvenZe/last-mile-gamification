import React, { useRef, useEffect } from 'react'

export default function MapView({ tourData, mode, selectedEdgeIds, onSelectEdge }) {
  const canvasRef = useRef(null)
  const [hoveredEdge, setHoveredEdge] = React.useState(null)

  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    
    const ctx = cvs.getContext('2d')
    const { width, height } = tourData.canvas
    const nodesById = {}
    tourData.nodes.forEach(n => { nodesById[n.id] = n })

    // Hintergrund - heller grau für Stadtatmosphäre
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(0, 0, width, height)

    // Zeichne Kanten als Straßen mit Asphalt-Look
    tourData.edges.forEach(e => {
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      
      const isHovered = hoveredEdge === e.id
      const isSelected = selectedEdgeIds.has(e.id)
      
      // Straßenbreite abhängig von Status
      let roadWidth = 14
      if (isSelected) roadWidth = 18
      else if (isHovered && mode === 'manual') roadWidth = 16
      
      // Straßenuntergrund (dunkler Asphalt)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = e.blocked ? '#7f1d1d' : '#374151'  // Dunkles Grau oder dunkelrot
      ctx.lineWidth = roadWidth
      ctx.lineCap = 'round'
      ctx.setLineDash([])
      ctx.stroke()
      
      // Mittellinie (gelb gestrichelt für normale Straßen)
      if (!e.blocked) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = isSelected ? '#fbbf24' : '#d1d5db'  // Gelb wenn ausgewählt
        ctx.lineWidth = 2
        ctx.setLineDash([8, 8])
        ctx.stroke()
        ctx.setLineDash([])
      }
      
      // Baustellenmarkierung (rot gestrichelt)
      if (e.blocked) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = '#dc2626'
        ctx.lineWidth = 3
        ctx.setLineDash([10, 10])
        ctx.stroke()
        ctx.setLineDash([])
      }
      
      // Highlight bei Hover
      if (isHovered && mode === 'manual' && !e.blocked) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'  // Blauer Glow
        ctx.lineWidth = roadWidth + 6
        ctx.lineCap = 'round'
        ctx.stroke()
      }
    })

    // Zeichne Kreuzungen und Markierungen
    tourData.nodes.forEach(n => {
      if (n.type === 'depot') {
        // Depot als großes Gebäude mit Schatten
        // Schatten
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.fillRect(n.x - 17, n.y - 17, 34, 34)
        
        // Gebäude
        ctx.fillStyle = '#1e40af'  // Dunkelblau
        ctx.fillRect(n.x - 20, n.y - 20, 40, 40)
        
        // Fenster
        ctx.fillStyle = '#60a5fa'
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            ctx.fillRect(n.x - 14 + i * 16, n.y - 14 + j * 16, 10, 10)
          }
        }
        
        // Label
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.strokeStyle = '#1e40af'
        ctx.lineWidth = 3
        ctx.strokeText('LAGER', n.x, n.y + 35)
        ctx.fillText('LAGER', n.x, n.y + 35)
        
      } else if (n.type === 'junction') {
        // Kreuzung als heller Kreis (wie Asphalt-Kreuzung)
        ctx.beginPath()
        ctx.arc(n.x, n.y, 12, 0, Math.PI * 2)
        ctx.fillStyle = '#4b5563'
        ctx.fill()
        
        // Innerer Kreis
        ctx.beginPath()
        ctx.arc(n.x, n.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#6b7280'
        ctx.fill()
        
      } else if (n.type === 'address') {
        // Adressen als kleine Häuser
        ctx.fillStyle = '#dc2626'  // Rot für Lieferadressen
        ctx.beginPath()
        // Haus-Form (Rechteck mit Dach)
        ctx.fillRect(n.x - 5, n.y - 3, 10, 8)
        ctx.moveTo(n.x - 6, n.y - 3)
        ctx.lineTo(n.x, n.y - 8)
        ctx.lineTo(n.x + 6, n.y - 3)
        ctx.closePath()
        ctx.fill()
        
        // Tür
        ctx.fillStyle = '#7f1d1d'
        ctx.fillRect(n.x - 2, n.y + 1, 4, 4)
      }
    })
  }, [tourData, selectedEdgeIds, hoveredEdge])

  function handleMouseMove(ev) {
    if (mode !== 'manual') return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top
    const edge = pickEdgeAt(x, y)
    setHoveredEdge(edge ? edge.id : null)
  }

  function distancePointToSegment(px, py, ax, ay, bx, by) {
    const vx = px - ax, vy = py - ay
    const ux = bx - ax, uy = by - ay
    const lenSq = ux*ux + uy*uy
    if (!lenSq) return Math.hypot(px - ax, py - ay)
    let t = (vx*ux + vy*uy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const dx = ax + t*ux - px
    const dy = ay + t*uy - py
    return Math.hypot(dx, dy)
  }

  function pickEdgeAt(x, y) {
    const nodesById = {}
    tourData.nodes.forEach(n => { nodesById[n.id] = n })
    let best = null, bestDist = 12  // Größerer Toleranzbereich für bessere Klickbarkeit
    tourData.edges.forEach(e => {
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      const d = distancePointToSegment(x, y, a.x, a.y, b.x, b.y)
      if (d < bestDist) { bestDist = d; best = e }
    })
    return best
  }

  function handleClick(ev) {
    if (mode !== 'manual') return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top
    const edge = pickEdgeAt(x, y)
    if (edge) onSelectEdge(edge)
  }

  return (
    <canvas
      ref={canvasRef}
      width={tourData.canvas.width}
      height={tourData.canvas.height}
      className="map-canvas"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredEdge(null)}
      style={{ cursor: mode === 'manual' ? 'crosshair' : 'default' }}
    />
  )
}

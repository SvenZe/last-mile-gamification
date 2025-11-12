import React, { useRef, useEffect } from 'react'

export default function MapView({ tourData, mode, selectedEdgeIds, visitedAddresses = new Set(), currentNode, onSelectEdge }) {
  const canvasRef = useRef(null)
  const [hoveredEdge, setHoveredEdge] = React.useState(null)

  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    
    // selectedEdgeIds ist ein Array, für schnelles Lookup in Set konvertieren
    const selectedSet = new Set(selectedEdgeIds)
    const ctx = cvs.getContext('2d')
    const { width, height} = tourData.canvas
    const nodesById = {}
    tourData.nodes.forEach(n => { nodesById[n.id] = n })

    // Hintergrund - dunkelblau
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    // PASS 1: Zeichne alle Straßen-Untergründe
    tourData.edges.forEach(e => {
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      
      const isHovered = hoveredEdge === e.id
      const isSelected = selectedSet.has(e.id)
      
      // Straßenbreite abhängig von Status
      let roadWidth = 14
      if (isSelected) roadWidth = 18
      else if (isHovered && mode === 'manual') roadWidth = 16
      
      // Straßenuntergrund
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = e.blocked ? '#7f1d1d' : '#ffffff'
      ctx.lineWidth = roadWidth
      ctx.lineCap = 'round'
      ctx.setLineDash([])
      ctx.stroke()
    })
    
    // PASS 2: Zeichne Mittellinien für ausgewählte Kanten (müssen ÜBER allen Straßen sein)
    tourData.edges.forEach(e => {
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      
      const isSelected = selectedSet.has(e.id)
      
      if (isSelected) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = e.blocked ? '#f97316' : '#3b82f6'
        ctx.lineWidth = 4
        ctx.setLineDash([])
        ctx.stroke()
      }
    })
    
    // PASS 3: Zeichne Baustellenmarkierungen
    tourData.edges.forEach(e => {
      if (!e.blocked) return
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 10])
      ctx.stroke()
      ctx.setLineDash([])
    })
    
    // PASS 4: Zeichne Hover-Highlights
    if (mode === 'manual' && hoveredEdge) {
      const e = tourData.edges.find(edge => edge.id === hoveredEdge)
      if (e && !e.blocked) {
        const a = nodesById[e.a], b = nodesById[e.b]
        if (a && b) {
          const isSelected = selectedSet.has(e.id)
          let roadWidth = isSelected ? 18 : 14
          
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
          ctx.lineWidth = roadWidth + 6
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }
    }

    // Zeichne Kreuzungen und Markierungen
    tourData.nodes.forEach(n => {
      if (n.type === 'depot') {
        const isCurrent = currentNode === n.id
        
        // Depot als großes Gebäude mit Schatten
        // Schatten
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.fillRect(n.x - 17, n.y - 17, 34, 34)
        
        // Gebäude - gelb highlighten wenn aktuell
        ctx.fillStyle = isCurrent ? '#fbbf24' : '#1e40af'  // Gelb wenn aktuell, sonst dunkelblau
        ctx.fillRect(n.x - 20, n.y - 20, 40, 40)
        
        // Fenster
        ctx.fillStyle = isCurrent ? '#fef3c7' : '#60a5fa'
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            ctx.fillRect(n.x - 14 + i * 16, n.y - 14 + j * 16, 10, 10)
          }
        }
        
        // Label
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.strokeStyle = isCurrent ? '#d97706' : '#1e40af'
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
        // Adressen als kleine Häuser - Farbe abhängig von Besuchsstatus
        const isVisited = visitedAddresses.has(n.id)
        const isCurrent = currentNode === n.id
        
        // Haus-Farbe: Grün wenn besucht, Gelb wenn aktuell, Blau wenn noch nicht besucht
        ctx.fillStyle = isVisited ? '#10b981' : (isCurrent ? '#fbbf24' : '#3b82f6')
        ctx.beginPath()
        // Haus-Form (Rechteck mit Dach)
        ctx.fillRect(n.x - 5, n.y - 3, 10, 8)
        ctx.moveTo(n.x - 6, n.y - 3)
        ctx.lineTo(n.x, n.y - 8)
        ctx.lineTo(n.x + 6, n.y - 3)
        ctx.closePath()
        ctx.fill()
        
        // Tür - dunkler Ton der Hausfarbe
        ctx.fillStyle = isVisited ? '#059669' : (isCurrent ? '#d97706' : '#1e40af')
        ctx.fillRect(n.x - 2, n.y + 1, 4, 4)
        
        // Häkchen für besuchte Adressen
        if (isVisited) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(n.x - 3, n.y - 1)
          ctx.lineTo(n.x - 1, n.y + 1)
          ctx.lineTo(n.x + 3, n.y - 3)
          ctx.stroke()
        }
        
      } else if (n.type === 'mid') {
        // Mid-Nodes als kleine graue Punkte
        ctx.beginPath()
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#6b7280'
        ctx.fill()
      }
    })
  }, [tourData, selectedEdgeIds, visitedAddresses, currentNode, hoveredEdge])

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
    
    // Sammle alle Kanten mit ihren Distanzen
    const candidates = []
    tourData.edges.forEach(e => {
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      
      const d = distancePointToSegment(x, y, a.x, a.y, b.x, b.y)
      const edgeLength = Math.hypot(b.x - a.x, b.y - a.y)
      
      // Längere Kanten (>150px) brauchen präziseren Klick
      const threshold = edgeLength > 150 ? 1.5 : 4
      
      if (d <= threshold) {
        candidates.push({ edge: e, dist: d, length: edgeLength })
      }
    })
    
    if (candidates.length === 0) return null
    
    // Strikte Priorität: Kurze Kanten haben Vorrang wenn sie erreichbar sind
    const shortEdges = candidates.filter(c => c.length <= 150)
    const longEdges = candidates.filter(c => c.length > 150)
    
    // Wenn kurze Kante gefunden, ignoriere lange Kanten komplett
    const pool = shortEdges.length > 0 ? shortEdges : longEdges
    
    // Sortiere nach Abstand, dann nach Länge
    pool.sort((a, b) => {
      if (Math.abs(a.dist - b.dist) < 0.5) {
        return a.length - b.length
      }
      return a.dist - b.dist
    })
    
    return pool[0].edge
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

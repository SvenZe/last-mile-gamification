/**
 * MapView.jsx
 * Main map component. Renders the canvas, handles mouse interactions,
 * and manages edge/node selection.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { getTrafficIntensity, getTrafficCategory, calculateTravelTime } from '../algorithms/trafficModel.js'
import { euclideanDistance, pointToSegmentDistance, minutesToHoursAndMinutes } from '../utils/mathHelpers.js'

const MapView = React.memo(function MapView({ 
  tourData, 
  mode, 
  selectedEdgeIds, 
  visitedAddresses = new Set(), 
  currentNode, 
  onSelectEdge, 
  detours = [],
  onNodeClick = null,
  selectedNodes = [],
  deliveryTimes = [],
  trafficModel = null,
  currentTime = 0,
  actualDeliveryTimes = null // For report view: actual arrival times
}) {
  const canvasRef = useRef(null)
  const [hoveredEdge, setHoveredEdge] = React.useState(null)
  const [hoveredNode, setHoveredNode] = React.useState(null)

  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    
    // Remove duplicate edge IDs from selection
    const uniqueSelectedIds = [...new Set(selectedEdgeIds)]
    const selectedSet = new Set(uniqueSelectedIds)
    const ctx = cvs.getContext('2d')
    const { width, height} = tourData.canvas
    const nodesById = {}
    tourData.nodes.forEach(n => { nodesById[n.id] = n })

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    // Some roads have duplicate edges at the same coordinates.
    // We only want to draw each physical road once.
    const edgesByCoords = new Map()
    
    tourData.edges.forEach(e => {
      const coordKey = [e.a, e.b].sort().join('→')
      if (!edgesByCoords.has(coordKey)) {
        edgesByCoords.set(coordKey, e)
      }
    })
    
    // Convert to ID-keyed map for lookups
    const uniqueEdgesMap = new Map()
    edgesByCoords.forEach((edge) => {
      uniqueEdgesMap.set(edge.id, edge)
    })

    // PASS 1a: Draw all roads with white background
    uniqueEdgesMap.forEach(e => {
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      
      const isHovered = hoveredEdge === e.id
      const isSelected = selectedSet.has(e.id)
      
      // Road width depends on status
      let roadWidth = 14
      if (isSelected) roadWidth = 18
      else if (isHovered && mode === 'manual') roadWidth = 16
      
      // All roads white as base
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = roadWidth
      ctx.lineCap = 'round'
      ctx.setLineDash([])
      ctx.stroke()
    })
    
    // PASS 1b: Draw traffic colors on top of white roads
    // In report mode, we need to track when we hit each edge during the simulated drive
    const edgeTrafficTimes = new Map()
    
    // Make sure we don't draw the same edge twice
    const drawnEdgesInPass1b = new Set()
    
    if (mode === 'view' && actualDeliveryTimes && actualDeliveryTimes.length > 0) {
      // Report mode: use actual simulation times
      // Walk through the route and track elapsed time
      let cumulativeTime = 0
      
      selectedEdgeIds.forEach((edgeId, index) => {
        const edge = tourData.edges.find(e => e.id === edgeId)
        if (!edge) return
        
        // Remember what time it was when we reached this edge
        edgeTrafficTimes.set(edgeId, cumulativeTime)
        
        // Figure out how long it took to drive this edge
        const edgeLength = edge.lengthKm || edge.distance || 0
        const edgeTraffic = trafficModel?.edges[edgeId]
        const travelTime = edgeTraffic 
          ? calculateTravelTime(edge, trafficModel, cumulativeTime, true)
          : (edgeLength / 30) * 60 // Fallback: 30 km/h
        
        cumulativeTime += travelTime
        
        // If we made a delivery here, add stop time
        const deliveryAtEdge = actualDeliveryTimes.find(d => d.edgeId === edgeId)
        if (deliveryAtEdge) {
          cumulativeTime += 7
        }
      })
    }
    
    uniqueEdgesMap.forEach(e => {
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      
      // Don't render the same edge twice
      if (drawnEdgesInPass1b.has(e.id)) {
        return
      }
      drawnEdgesInPass1b.add(e.id)
      
      const isHovered = hoveredEdge === e.id
      const isSelected = selectedSet.has(e.id)
      
      let roadWidth = 14
      if (isSelected) roadWidth = 18
      else if (isHovered && mode === 'manual') roadWidth = 16
      
      // Figure out what color to paint this road
      let roadColor = null
      
      // Construction zones: show dark red only in view/auto/adjust modes, white in manual mode
      if (e.blocked && mode !== 'manual') {
        roadColor = '#7f1d1d'
      } else if (trafficModel && trafficModel.edges[e.id]) {
        const edgeTraffic = trafficModel.edges[e.id]
        
        if (mode === 'view') {
          // Report mode: only show traffic on the route we drove
          if (isSelected && edgeTrafficTimes.has(e.id)) {
            const timeToUse = edgeTrafficTimes.get(e.id)
            const intensity = getTrafficIntensity(timeToUse, edgeTraffic)
            const category = getTrafficCategory(intensity)
            
            if (category === 'high') roadColor = '#ef4444'
            else if (category === 'medium') roadColor = '#f59e0b'
          }
          // Leave non-route roads white
        } else if (mode !== 'manual') {
          // Planning modes (except manual): show traffic on all roads based on time slider
          const intensity = getTrafficIntensity(currentTime, edgeTraffic)
          const category = getTrafficCategory(intensity)
          
          if (category === 'high') roadColor = '#ef4444'      // Red
          else if (category === 'medium') roadColor = '#f59e0b' // Yellow
          // White for low traffic (already drawn)
        }
      }
      
      // Paint over the white with traffic color
      if (roadColor) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = roadColor
        ctx.lineWidth = roadWidth
        ctx.lineCap = 'round'
        ctx.setLineDash([])
        ctx.stroke()
      }
    })
    
    // PASS 2: Draw centerlines for selected edges (must be ABOVE all roads)
    uniqueEdgesMap.forEach(e => {
      const a = nodesById[e.a], b = nodesById[e.b]
      if (!a || !b) return
      
      const isSelected = selectedSet.has(e.id)
      
      if (isSelected) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = (mode === 'view' && e.blocked) ? '#f97316' : '#3b82f6'
        ctx.lineWidth = 6  // Thicker for better visibility
        ctx.setLineDash([])
        ctx.stroke()
      }
    })
    
    // PASS 3: Draw construction zone markings (only in view, auto, adjust modes)
    if (mode === 'view' || mode === 'auto' || mode === 'adjust') {
      uniqueEdgesMap.forEach(e => {
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
    }
    
    // PASS 3b: Draw detour routes in yellow
    detours.forEach(detour => {
      detour.detourEdges.forEach(edge => {
        const a = nodesById[edge.a], b = nodesById[edge.b]
        if (!a || !b) return
          
          // Yellow background for detour
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 18
          ctx.lineCap = 'round'
          ctx.setLineDash([])
          ctx.stroke()
          
          // Yellow centerline
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 4
        ctx.setLineDash([])
        ctx.stroke()
      })
    })

    
    // PASS 4: Draw junctions and markers
    tourData.nodes.forEach(n => {
      if (n.type === 'depot') {
        const isCurrent = currentNode === n.id
        
        // Depot as large building with shadow
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.fillRect(n.x - 17, n.y - 17, 34, 34)
        
        // Building - highlight yellow if current
        ctx.fillStyle = isCurrent ? '#fbbf24' : '#1e40af'
        ctx.fillRect(n.x - 20, n.y - 20, 40, 40)
        
        // Windows
        ctx.fillStyle = isCurrent ? '#fef3c7' : '#60a5fa'
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            ctx.fillRect(n.x - 14 + i * 16, n.y - 14 + j * 16, 10, 10)
          }
        }
        
        // Label - above the building
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.strokeStyle = isCurrent ? '#d97706' : '#1e40af'
        ctx.lineWidth = 3
        ctx.strokeText('LAGER', n.x, n.y - 28)
        ctx.fillText('LAGER', n.x, n.y - 28)
        
      } else if (n.type === 'junction') {
        // Junction as light circle (like asphalt intersection)
        ctx.beginPath()
        ctx.arc(n.x, n.y, 12, 0, Math.PI * 2)
        ctx.fillStyle = '#4b5563'
        ctx.fill()
        
        // Inner circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#6b7280'
        ctx.fill()
        
      } else if (n.type === 'address') {
        // Addresses as circles - color depends on route and selection
        const isVisited = visitedAddresses.has(n.id)
        const isCurrent = currentNode === n.id
        const isSelectedForSwap = selectedNodes.includes(n.id)
        const isHoveredNode = hoveredNode === n.id
        
        // Check if this address is in the delivery route
        let deliveryInfo = deliveryTimes.find(d => d.nodeId === n.id)
        
        // In report view, also check actualDeliveryTimes if deliveryInfo is missing
        if (!deliveryInfo && actualDeliveryTimes) {
          const actualInfo = actualDeliveryTimes.find(d => d.nodeId === n.id)
          if (actualInfo) {
            // Create deliveryInfo from actualDeliveryTimes
            const arrivalMin = actualInfo.arrivalMin
            const timeWindow = arrivalMin <= 60 ? '7-8' : arrivalMin <= 120 ? '8-9' : '9-10'
            const stopNumber = actualDeliveryTimes.filter(d => d.arrivalMin <= arrivalMin).length
            deliveryInfo = { nodeId: n.id, stopNumber, arrivalMin, timeWindow }
          }
        }
        
        const isInRoute = deliveryInfo !== undefined
        
        // Highlight for selected nodes (for swap)
        if (isSelectedForSwap || isHoveredNode) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, 20, 0, Math.PI * 2)
          ctx.fillStyle = isSelectedForSwap ? 'rgba(251, 191, 36, 0.3)' : 'rgba(59, 130, 246, 0.2)'
          ctx.fill()
          ctx.strokeStyle = isSelectedForSwap ? '#f59e0b' : '#3b82f6'
          ctx.lineWidth = 3
          ctx.stroke()
        }
        
        // Circle: Orange if selected for swap, GREEN if in route, else blue
        ctx.beginPath()
        ctx.arc(n.x, n.y, 12, 0, Math.PI * 2)
        ctx.fillStyle = isSelectedForSwap ? '#f59e0b' : (isInRoute ? '#10b981' : '#3b82f6')
        ctx.fill()
        
        // White border around circle
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Display stop number INSIDE the circle and time window below
        if (deliveryInfo) {
          // Stop number inside circle - white text, bold and large
          ctx.font = 'bold 14px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#ffffff'
          ctx.fillText(deliveryInfo.stopNumber.toString(), n.x, n.y)
          
          // Time window below circle - white box with black text
          ctx.font = 'bold 14px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          
          // Show time window and optionally actual arrival time in report mode
          let timeText = `${deliveryInfo.timeWindow} Uhr`
          
          // In report mode, also show actual arrival time
          if (mode === 'view') {
            const actualTime = actualDeliveryTimes?.find(d => d.nodeId === n.id)
            if (actualTime) {
              const actualHours = 7 + Math.floor(actualTime.arrivalMin / 60)
              const actualMins = actualTime.arrivalMin % 60
              const actualTimeStr = `${actualHours}:${actualMins.toString().padStart(2, '0')}`
              timeText = `${deliveryInfo.timeWindow} | ${actualTimeStr}`
            }
          }
          
          const textMetrics = ctx.measureText(timeText)
          const boxWidth = textMetrics.width + 16
          const boxHeight = 22
          const boxX = n.x - boxWidth / 2
          const boxY = n.y + 20
          
          // White background box with border
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 1.5
          ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
          
          // Black text
          ctx.fillStyle = '#000000'
          ctx.fillText(timeText, n.x, boxY + 4)
        }
        
      } else if (n.type === 'mid') {
        // Mid-Nodes als kleine graue Punkte
        ctx.beginPath()
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#6b7280'
        ctx.fill()
      }
    })
    
    // PASS 5: Zeichne Hover-Highlights (nach Knoten, vor Text)
    if (mode === 'manual' && hoveredEdge) {
      const e = tourData.edges.find(edge => edge.id === hoveredEdge)
      if (e) {
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
    
    // PASS 6: Draw distance and travel time on edges (at the very end)
    // Show info only for hovered or selected edges
    if (mode === 'manual' || mode === 'auto' || mode === 'adjust') {
      tourData.edges.forEach(e => {
        const a = nodesById[e.a], b = nodesById[e.b]
        if (!a || !b) return
        
        const isHovered = hoveredEdge === e.id
        
        // Show info only when hovering
        if (!isHovered) return
        
        // Calculate edge length in pixels
        const edgeLengthPx = euclideanDistance(a.x, a.y, b.x, b.y)
        
        // Skip very short edges (under 50 pixels)
        if (edgeLengthPx < 50) return
        
        // Mittelpunkt der Kante
        const midX = (a.x + b.x) / 2
        const midY = (a.y + b.y) / 2
        
        // Kilometer (aus edge.lengthKm oder berechnet)
        const lengthKm = e.lengthKm || (edgeLengthPx * 0.01)
        
        // Calculate travel time - with traffic if available
        let timeMin
        let trafficInfo = ''
        
        if ((mode === 'auto' || mode === 'adjust') && trafficModel && trafficModel.edges[e.id]) {
          // Use actual traffic model
          timeMin = calculateTravelTime(e, trafficModel, currentTime)
          const edgeTraffic = trafficModel.edges[e.id]
          const intensity = getTrafficIntensity(currentTime, edgeTraffic)
          const category = getTrafficCategory(intensity)
          
          if (category === 'high') trafficInfo = ' (hoch)'
          else if (category === 'medium') trafficInfo = ' (mittel)'
        } else {
          // Standard calculation (30 km/h)
          timeMin = (lengthKm / 30) * 60
        }
        
        // Text-Hintergrund (halbtransparentes Rechteck)
        const text = `${lengthKm.toFixed(2)} km • ~${Math.round(timeMin)} min${trafficInfo}`
        
        ctx.font = 'bold 13px sans-serif'
        const textWidth = ctx.measureText(text).width
        
        // Bei horizontalen Kanten (dy klein) -> Text oberhalb
        const dx = Math.abs(b.x - a.x)
        const dy = Math.abs(b.y - a.y)
        const isHorizontal = dx > dy * 2
        const offsetY = isHorizontal ? -25 : 0
        
        // Hintergrund mit mehr Padding
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
        ctx.fillRect(midX - textWidth / 2 - 6, midY + offsetY - 11, textWidth + 12, 22)
        
        // Border - yellow for hover
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2
        ctx.strokeRect(midX - textWidth / 2 - 6, midY + offsetY - 11, textWidth + 12, 22)
        
        // Text
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, midX, midY + offsetY)
      })
    }
    

  }, [tourData, selectedEdgeIds, visitedAddresses, currentNode, hoveredEdge, mode, detours, selectedNodes, hoveredNode, deliveryTimes, trafficModel, currentTime, actualDeliveryTimes])

  function handleMouseMove(ev) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top
    
    // In adjust mode, check for both node and edge hover
    if (mode === 'adjust' && onNodeClick) {
      const node = pickNodeAt(x, y)
      if (node) {
        // Node has priority
        setHoveredNode(node.id)
        setHoveredEdge(null)
      } else {
        // Check for edge hover
        const edge = pickEdgeAt(x, y)
        setHoveredNode(null)
        setHoveredEdge(edge ? edge.id : null)
      }
      return
    }
    
    // In manual/auto mode, check for edge hover
    if (mode !== 'manual' && mode !== 'auto') return
    const edge = pickEdgeAt(x, y)
    setHoveredEdge(edge ? edge.id : null)
    setHoveredNode(null)
  }
  
  function pickNodeAt(x, y) {
    const nodesById = {}
    tourData.nodes.forEach(n => { nodesById[n.id] = n })
    
    // Check for address nodes within click radius
    for (const node of tourData.nodes) {
      if (node.type !== 'address') continue
      
      const dist = euclideanDistance(x, y, node.x, node.y)
      if (dist <= 15) { // 15px click radius
        return node
      }
    }
    return null
  }

  function distancePointToSegment(px, py, ax, ay, bx, by) {
    return pointToSegmentDistance(px, py, ax, ay, bx, by)
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
      const edgeLength = euclideanDistance(a.x, a.y, b.x, b.y)
      
      // Longer edges (>150px) need more precise clicks
      const threshold = edgeLength > 150 ? 1.5 : 4
      
      if (d <= threshold) {
        candidates.push({ edge: e, dist: d, length: edgeLength })
      }
    })
    
    if (candidates.length === 0) return null
    
    // Strict priority: Short edges take precedence if reachable
    const shortEdges = candidates.filter(c => c.length <= 150)
    const longEdges = candidates.filter(c => c.length > 150)
    
    // Wenn kurze Kante gefunden, ignoriere lange Kanten komplett
    const pool = shortEdges.length > 0 ? shortEdges : longEdges
    
    // Sort by distance, then by length
    pool.sort((a, b) => {
      if (Math.abs(a.dist - b.dist) < 0.5) {
        return a.length - b.length
      }
      return a.dist - b.dist
    })
    
    return pool[0].edge
  }

  function handleClick(ev) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top
    
    // In adjust mode, handle node clicks
    if (mode === 'adjust' && onNodeClick) {
      const node = pickNodeAt(x, y)
      if (node) {
        onNodeClick(node.id)
      }
      return
    }
    
    // In manual mode, handle edge clicks
    if (mode !== 'manual') return
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
      onMouseLeave={() => {
        setHoveredEdge(null)
        setHoveredNode(null)
      }}
      style={{ cursor: mode === 'manual' ? 'crosshair' : (mode === 'auto' || mode === 'adjust' ? 'pointer' : 'default') }}
    />
  )
})

export default MapView

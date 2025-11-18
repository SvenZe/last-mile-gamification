/**
 * MapRenderer.js
 * 
 * Canvas rendering for the map. Draws roads with traffic coloring, nodes,
 * route highlights, construction zones, and labels. Split into multiple
 * passes to get the z-ordering right.
 */

export function renderMap(ctx, tourData, state) {
  const { width, height } = tourData.canvas
  const {
    selectedEdgeIds = [],
    mode = 'manual',
    hoveredEdge = null,
    detours = [],
    trafficState = null,
    currentSimTime = 0,
    edgeTrafficAtTime = null,
    visitedAddresses = new Set(),
    stopSequence = null,
    deliveryTimes = null,
    timeWindows = null,
    hoveredStop = null,
    selectedStop = null
  } = state

  const nodesById = {}
  tourData.nodes.forEach(n => { nodesById[n.id] = n })

  const selectedSet = new Set(selectedEdgeIds)

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, height)

  // Draw in layers to get proper z-ordering
  drawRoadBackgrounds(ctx, tourData, nodesById, selectedSet, hoveredEdge, mode, trafficState, currentSimTime, edgeTrafficAtTime)
  drawSelectedEdges(ctx, tourData, nodesById, selectedSet, mode)

  if (mode === 'view') {
    drawConstructionMarkers(ctx, tourData, nodesById)
    drawDetours(ctx, detours, nodesById)
  }

  // PASS 4: Draw all nodes
  drawNodes(ctx, tourData, visitedAddresses)

  // PASS 5: Draw stop sequence numbers (if available)
  if (stopSequence && stopSequence.length > 0) {
    drawStopSequence(ctx, stopSequence, nodesById, deliveryTimes, timeWindows, hoveredStop, selectedStop)
  }

  // PASS 6: Draw labels and time windows
  drawLabels(ctx, tourData, visitedAddresses, timeWindows)
}

/**
 * PASS 1: Draw road backgrounds with traffic coloring
 * Each edge is drawn exactly once based on current slider time
 */
function drawRoadBackgrounds(ctx, tourData, nodesById, selectedSet, hoveredEdge, mode, trafficState, currentSimTime, edgeTrafficAtTime) {
  // Create unique edge map to prevent duplicates
  const uniqueEdges = new Map()
  tourData.edges.forEach(e => {
    if (!uniqueEdges.has(e.id)) {
      uniqueEdges.set(e.id, e)
    }
  })
  
  // Draw each edge exactly once
  uniqueEdges.forEach(e => {
    
    const a = nodesById[e.a]
    const b = nodesById[e.b]
    if (!a || !b) return

    const isHovered = hoveredEdge === e.id
    const isSelected = selectedSet.has(e.id)

    // Street width depends on status
    let roadWidth = 14
    if (isSelected) roadWidth = 18
    else if (isHovered && mode === 'manual') roadWidth = 16

    // Determine base color based on traffic/construction
    let baseColor = '#ffffff'

    if (mode === 'view' && e.blocked) {
      baseColor = '#7f1d1d' // Construction
    } else if (edgeTrafficAtTime && edgeTrafficAtTime[e.id]) {
      // REPORT MODE: Show actual traffic when edge was traversed
      const trafficInfo = edgeTrafficAtTime[e.id]
      const speedFactor = trafficInfo.speedFactor

      if (speedFactor < 0.55) {
        baseColor = '#dc2626' // Heavy traffic (red)
      } else if (speedFactor < 0.75) {
        baseColor = '#f97316' // Moderate traffic (orange)
      }
    } else if (isSelected && trafficState && trafficState.streetTypes && !edgeTrafficAtTime) {
      // PLANNING MODE: Show traffic ONLY for selected edges based on current slider time
      const streetType = trafficState.streetTypes[e.id] || 'side'
      const baseVariation = trafficState.baseVariations[e.id] || 1.0

      // Calculate rush hour impact
      let rushHourMultiplier = 1.0
      if (currentSimTime < 60) {
        rushHourMultiplier = 0.7 // 7-8 AM: Heavy
      } else if (currentSimTime < 120) {
        rushHourMultiplier = 0.85 // 8-9 AM: Moderate
      }

      // Calculate base speed for street type
      let baseSpeed = streetType === 'main' ? 0.75 : streetType === 'secondary' ? 0.85 : 0.95

      // Apply rush hour effects
      let rushHourImpact = streetType === 'main' ? rushHourMultiplier :
        streetType === 'secondary' ? (0.9 + rushHourMultiplier * 0.1) : 0.97

      const speedFactor = baseSpeed * rushHourImpact * baseVariation

      if (speedFactor < 0.55) {
        baseColor = '#dc2626' // Heavy traffic
      } else if (speedFactor < 0.75) {
        baseColor = '#f97316' // Moderate traffic
      }
    }

    // Draw the road segment with opaque colors (no transparency)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = baseColor
    ctx.lineWidth = roadWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([])
    ctx.globalAlpha = 1.0 // Completely opaque
    ctx.globalCompositeOperation = 'source-over'
    ctx.stroke()
    ctx.restore()
  })
}

/**
 * PASS 2: Draw center lines for selected edges
 */
function drawSelectedEdges(ctx, tourData, nodesById, selectedSet, mode) {
  tourData.edges.forEach(e => {
    const a = nodesById[e.a]
    const b = nodesById[e.b]
    if (!a || !b) return

    const isSelected = selectedSet.has(e.id)

    if (isSelected) {
      // Draw white outline for better visibility
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 6
      ctx.setLineDash([])
      ctx.stroke()
      
      // Draw blue center line
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = (mode === 'view' && e.blocked) ? '#f97316' : '#3b82f6'
      ctx.lineWidth = 4
      ctx.setLineDash([])
      ctx.stroke()
      
      // Draw edge label in planning mode
      if (mode === 'manual' || mode === 'auto') {
        const midX = (a.x + b.x) / 2
        const midY = (a.y + b.y) / 2
        
        // Background box for label
        ctx.font = 'bold 10px sans-serif'
        const labelText = e.id
        const textWidth = ctx.measureText(labelText).width
        
        // White background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(midX - textWidth / 2 - 3, midY - 8, textWidth + 6, 14)
        
        // Dark border
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 1
        ctx.strokeRect(midX - textWidth / 2 - 3, midY - 8, textWidth + 6, 14)
        
        // Edge ID text
        ctx.fillStyle = '#1e40af'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(labelText, midX, midY)
      }
    }
  })
}

/**
 * PASS 3: Draw construction markers
 */
function drawConstructionMarkers(ctx, tourData, nodesById) {
  tourData.edges.forEach(e => {
    if (!e.blocked) return
    const a = nodesById[e.a]
    const b = nodesById[e.b]
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

/**
 * Draw detour routes
 */
function drawDetours(ctx, detours, nodesById) {
  detours.forEach(detour => {
    detour.detourEdges.forEach(edge => {
      const a = nodesById[edge.a]
      const b = nodesById[edge.b]
      if (!a || !b) return

      // Yellow background
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 18
      ctx.lineCap = 'round'
      ctx.setLineDash([])
      ctx.stroke()

      // Darker center line
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 6
      ctx.setLineDash([])
      ctx.stroke()
    })
  })
}

/**
 * PASS 4: Draw all nodes
 */
function drawNodes(ctx, tourData, visitedAddresses) {
  tourData.nodes.forEach(n => {
    const isVisited = visitedAddresses.has(n.id)

    if (n.type === 'depot') {
      // Depot: Large blue circle with white border
      ctx.beginPath()
      ctx.arc(n.x, n.y, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#3b82f6'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.stroke()
    } else if (n.type === 'address') {
      // Address: Circle, green if visited, gray if not
      ctx.beginPath()
      ctx.arc(n.x, n.y, 10, 0, Math.PI * 2)
      ctx.fillStyle = isVisited ? '#10b981' : '#64748b'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      // Junction: Small gray dot
      ctx.beginPath()
      ctx.arc(n.x, n.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#475569'
      ctx.fill()
    }
  })
}

/**
 * PASS 5: Draw stop sequence numbers
 */
function drawStopSequence(ctx, stopSequence, nodesById, deliveryTimes, timeWindows, hoveredStop, selectedStop) {
  stopSequence.forEach((nodeId, index) => {
    const node = nodesById[nodeId]
    if (!node) return

    const stopNumber = index + 1
    const isHovered = hoveredStop === nodeId
    const isSelected = selectedStop === nodeId

    // Find delivery time info for this stop
    const deliveryInfo = deliveryTimes ? deliveryTimes.find(dt => dt.stopId === nodeId) : null
    const exceedsLimit = deliveryInfo ? deliveryInfo.exceedsLimit : false

    // Determine status color
    let statusColor = exceedsLimit ? '#dc2626' : '#10b981' // Red if exceeds limit, green otherwise

    // Circle background
    const radius = isSelected ? 22 : isHovered ? 20 : 18
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = statusColor
    ctx.fill()

    // White border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = isSelected ? 4 : 3
    ctx.stroke()

    // Stop number
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(stopNumber.toString(), node.x, node.y)

    // Draw time window below the circle
    if (deliveryInfo) {
      const { hours: arrivalHours, minutes: arrivalMins } = minutesToHoursAndMinutes(deliveryInfo.arrivalMin)
      const hours = arrivalHours
      const mins = arrivalMins
      const timeText = `${hours}:${mins.toString().padStart(2, '0')}`
      const windowText = deliveryInfo.timeWindow

      // Background box for time info
      const boxY = node.y + radius + 8
      ctx.font = 'bold 11px sans-serif'
      const timeWidth = ctx.measureText(timeText).width
      const windowWidth = ctx.measureText(windowText).width
      const maxWidth = Math.max(timeWidth, windowWidth)
      const boxWidth = maxWidth + 12
      const boxHeight = 32

      // Semi-transparent background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
      ctx.fillRect(node.x - boxWidth / 2, boxY, boxWidth, boxHeight)

      // Border - red if exceeds limit, green otherwise
      ctx.strokeStyle = exceedsLimit ? '#dc2626' : '#10b981'
      ctx.lineWidth = 2
      ctx.strokeRect(node.x - boxWidth / 2, boxY, boxWidth, boxHeight)

      // Time text (actual arrival)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(timeText, node.x, boxY + 11)

      // Window text (assigned slot)
      ctx.fillStyle = exceedsLimit ? '#fca5a5' : '#86efac'
      ctx.font = '10px sans-serif'
      ctx.fillText(windowText, node.x, boxY + 24)
    }
  })
}

/**
 * PASS 6: Draw labels and time windows
 */
function drawLabels(ctx, tourData, visitedAddresses, timeWindows) {
  tourData.nodes.forEach(n => {
    if (!n.label) return

    // Only show labels for depot (not for addresses)
    if (n.type === 'depot') {
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      // Position label above depot to avoid overlapping roads
      ctx.fillText(n.label, n.x, n.y - 28)
    }
    
    // Show time windows for addresses (if available)
    if (n.type === 'address' && timeWindows && timeWindows[n.id]) {
      const window = timeWindows[n.id]
      const startHour = Math.floor(window.start / 60) + 7
      const startMin = window.start % 60
      const endHour = Math.floor(window.end / 60) + 7
      const endMin = window.end % 60
      
      const timeText = `${startHour}:${startMin.toString().padStart(2, '0')}-${endHour}:${endMin.toString().padStart(2, '0')}`
      
      // Background box with white background for better readability
      ctx.font = 'bold 11px sans-serif'
      const textWidth = ctx.measureText(timeText).width
      
      // White background with dark border
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(n.x - textWidth / 2 - 4, n.y + 18, textWidth + 8, 16)
      
      // Dark border around box
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.5
      ctx.strokeRect(n.x - textWidth / 2 - 4, n.y + 18, textWidth + 8, 16)
      
      // Time window text in dark blue
      ctx.fillStyle = '#1e40af'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(timeText, n.x, n.y + 20)
    }
    
    // Addresses get no labels to keep map clean
  })
}

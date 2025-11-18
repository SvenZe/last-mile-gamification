import { useState, useCallback } from 'react'
import { calculateNetworkDistance } from '../algorithms/networkDistance.js'
import { getEdgeLength } from '../utils/edgeHelpers.js'

/**
 * Custom Hook for Route Adjustment Logic
 * 
 * Handles drag-and-drop reordering of stops in auto-generated routes.
 * Validates route constraints (vehicle range, capacity, time windows).
 * 
 * @param {Object} tourSetup - Tour network data
 * @param {Object} vehicle - Selected vehicle configuration
 * @param {Object} nodesById - Node lookup table
 * @param {Function} getCluster - Function to get coincident nodes
 * @returns {Object} State and handlers for route adjustment
 */
export function useRouteAdjustment(tourSetup, vehicle, nodesById, getCluster) {
  // Editable sequence of stop IDs
  const [editableStopSequence, setEditableStopSequence] = useState([])
  
  // Index of stop being dragged
  const [draggingStopIndex, setDraggingStopIndex] = useState(null)
  
  // Validation result
  const [adjustmentValidation, setAdjustmentValidation] = useState({ 
    valid: true, 
    messages: [] 
  })
  
  /**
   * Initialize editable sequence from stop array.
   */
  const initializeSequence = useCallback((stops) => {
    setEditableStopSequence([...stops])
    validateSequence([...stops])
  }, [])
  
  /**
   * Handle drag start event.
   */
  const handleDragStart = useCallback((index) => {
    setDraggingStopIndex(index)
  }, [])
  
  /**
   * Handle drop event - reorder stops.
   */
  const handleDrop = useCallback((targetIndex) => {
    if (draggingStopIndex === null || draggingStopIndex === targetIndex) {
      setDraggingStopIndex(null)
      return
    }
    
    const newSequence = [...editableStopSequence]
    const [draggedItem] = newSequence.splice(draggingStopIndex, 1)
    newSequence.splice(targetIndex, 0, draggedItem)
    
    setEditableStopSequence(newSequence)
    setDraggingStopIndex(null)
    
    // Validate new sequence
    validateSequence(newSequence)
  }, [draggingStopIndex, editableStopSequence])
  
  /**
   * Handle drag over event (allow drop).
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])
  
  /**
   * Validate route sequence against vehicle constraints.
   * Checks: distance vs range, total time vs time window.
   */
  const validateSequence = useCallback((sequence) => {
    const messages = []
    let valid = true
    
    if (!vehicle || !tourSetup || sequence.length === 0) {
      setAdjustmentValidation({ valid: true, messages: [] })
      return
    }
    
    // Find depot
    const depot = tourSetup.nodes.find(n => n.type === 'depot')
    if (!depot) {
      setAdjustmentValidation({ 
        valid: false, 
        messages: ['Depot nicht gefunden'] 
      })
      return
    }
    
    const depotId = depot.id
    
    // Calculate total distance
    let totalKm = 0
    
    // Depot to first stop
    totalKm += calculateNetworkDistance(depotId, sequence[0])
    
    // Between stops
    for (let i = 0; i < sequence.length - 1; i++) {
      totalKm += calculateNetworkDistance(sequence[i], sequence[i + 1])
    }
    
    // Last stop back to depot
    totalKm += calculateNetworkDistance(sequence[sequence.length - 1], depotId)
    
    // Check vehicle range
    if (vehicle.rangeKm && totalKm > vehicle.rangeKm) {
      messages.push(`Reichweite überschritten: ${totalKm.toFixed(1)} km > ${vehicle.rangeKm} km`)
      valid = false
    }
    
    // Calculate estimated time
    const avgSpeedKmh = 30
    const driveTimeMin = (totalKm / avgSpeedKmh) * 60
    const stopTimeMin = sequence.length * 8  // 8 minutes per stop
    const totalTimeMin = driveTimeMin + stopTimeMin
    
    // Check time window (3 hours = 180 minutes)
    if (totalTimeMin > 180) {
      messages.push(`Zeitfenster überschritten: ${Math.round(totalTimeMin)} min > 180 min`)
      valid = false
    }
    
    // Success message
    if (valid) {
      messages.push(`Route ist valide: ${totalKm.toFixed(1)} km, ${Math.round(totalTimeMin)} min`)
    }
    
    setAdjustmentValidation({ valid, messages })
  }, [vehicle, tourSetup])
  
  /**
   * Reset to initial state.
   */
  const resetAdjustment = useCallback(() => {
    setEditableStopSequence([])
    setDraggingStopIndex(null)
    setAdjustmentValidation({ valid: true, messages: [] })
  }, [])
  
  return {
    editableStopSequence,
    setEditableStopSequence,
    draggingStopIndex,
    adjustmentValidation,
    initializeSequence,
    handleDragStart,
    handleDrop,
    handleDragOver,
    validateSequence,
    resetAdjustment
  }
}

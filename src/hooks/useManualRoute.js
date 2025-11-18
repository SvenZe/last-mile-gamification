import { useState, useCallback } from 'react'

/**
 * Custom hook for manual route planning logic
 * Manages edge selection, address tracking, and undo/reset functionality
 * 
 * @param {Object} tourSetup - Tour network data
 * @param {string} depotId - Depot node ID
 * @param {Object} nodesById - Node lookup table
 * @param {Function} getCluster - Function to get coincident nodes
 * @param {Function} pickPrimaryNode - Function to pick primary node from cluster
 * @param {Function} collectVisitedAddresses - Function to collect addresses from cluster
 * @param {string[]} startAnchorIds - Depot cluster node IDs
 * @returns {Object} State and handlers for manual route planning
 */
export function useManualRoute(tourSetup, depotId, nodesById, getCluster, pickPrimaryNode, collectVisitedAddresses, startAnchorIds) {
  const [manualEdges, setManualEdges] = useState([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState([])
  const [visitedAddresses, setVisitedAddresses] = useState(new Set())
  const [currentEndNode, setCurrentEndNode] = useState(null)
  const [selectionMessage, setSelectionMessage] = useState(null)

  /**
   * Handle edge selection in manual route building mode.
   */
  const handleEdgeSelect = useCallback((edge) => {
    // First edge: must start at depot
    if (manualEdges.length === 0) {
      const touchesStart = startAnchorIds.includes(edge.a) || startAnchorIds.includes(edge.b)
      if (!touchesStart) {
        setSelectionMessage('Erste Kante muss am Depot starten (Depot teilt sich Koordinaten mit K02).')
        return
      }

      const startId = startAnchorIds.includes(edge.a) ? edge.a : edge.b
      const targetId = edge.a === startId ? edge.b : edge.a

      const newVisited = new Set()
      const targetCluster = getCluster(targetId)
      collectVisitedAddresses(targetCluster, newVisited)
      
      const newPrimary = pickPrimaryNode(targetCluster)
      
      setManualEdges([edge])
      setSelectedEdgeIds([edge.id])
      setVisitedAddresses(newVisited)
      setCurrentEndNode(newPrimary)
      setSelectionMessage(null)
      return
    }

    // Subsequent edges: must connect to current position
    const currentCluster = getCluster(currentEndNode)
    const connectsToCurrent = currentCluster.some(id => id === edge.a || id === edge.b)
    
    const atDepotCluster = currentCluster.some(id => startAnchorIds.includes(id))
    const connectsToDepot = atDepotCluster && (startAnchorIds.includes(edge.a) || startAnchorIds.includes(edge.b))
    
    if (!connectsToCurrent && !connectsToDepot) {
      setSelectionMessage(`Kante ${edge.id} schließt nicht an Position ${currentEndNode} an. Aktuelle Nachbarn: ${currentCluster.join(', ')}`)
      return
    }
    
    const anchorId = connectsToCurrent
      ? (currentCluster.includes(edge.a) ? edge.a : edge.b)
      : (startAnchorIds.includes(edge.a) ? edge.a : edge.b)
    const newEndNode = anchorId === edge.a ? edge.b : edge.a
    
    const newVisited = new Set(visitedAddresses)
    const arrivalCluster = getCluster(newEndNode)
    collectVisitedAddresses(arrivalCluster, newVisited)
    
    const newPrimary = pickPrimaryNode(arrivalCluster)
    const newEdges = [...manualEdges, edge]
    const newSelectedIds = [...selectedEdgeIds, edge.id]
    
    setManualEdges(newEdges)
    setSelectedEdgeIds(newSelectedIds)
    setVisitedAddresses(newVisited)
    setCurrentEndNode(newPrimary)
    setSelectionMessage(null)
  }, [manualEdges, selectedEdgeIds, visitedAddresses, currentEndNode, startAnchorIds, getCluster, pickPrimaryNode, collectVisitedAddresses])

  /**
   * Undo last edge selection.
   */
  const undoLastEdge = useCallback(() => {
    if (manualEdges.length === 0) return
    
    const newEdges = manualEdges.slice(0, -1)
    const newSelectedIds = selectedEdgeIds.slice(0, -1)
    
    // Replay route to recalculate state
    const newVisited = new Set()
    let newCurrentNode = null
    
    if (newEdges.length === 0) {
      setManualEdges([])
      setSelectedEdgeIds([])
      setVisitedAddresses(new Set())
      setCurrentEndNode(null)
      setSelectionMessage(null)
      return
    }
    
    // Replay edges to rebuild state
    let currentPos = depotId
    newEdges.forEach(edge => {
      const currentCluster = getCluster(currentPos)
      const connectsToCurrent = currentCluster.some(id => id === edge.a || id === edge.b)
      const connectsToDepot = currentCluster.some(id => startAnchorIds.includes(id)) &&
                              (startAnchorIds.includes(edge.a) || startAnchorIds.includes(edge.b))
      
      if (!connectsToCurrent && !connectsToDepot) return
      
      const anchorId = connectsToCurrent
        ? (currentCluster.includes(edge.a) ? edge.a : edge.b)
        : (startAnchorIds.includes(edge.a) ? edge.a : edge.b)
      const newEndNode = anchorId === edge.a ? edge.b : edge.a
      
      const arrivalCluster = getCluster(newEndNode)
      collectVisitedAddresses(arrivalCluster, newVisited)
      
      currentPos = pickPrimaryNode(arrivalCluster)
    })
    
    newCurrentNode = currentPos
    
    setManualEdges(newEdges)
    setSelectedEdgeIds(newSelectedIds)
    setVisitedAddresses(newVisited)
    setCurrentEndNode(newCurrentNode)
    setSelectionMessage(null)
  }, [manualEdges, selectedEdgeIds, depotId, getCluster, pickPrimaryNode, collectVisitedAddresses, startAnchorIds])

  /**
   * Reset entire route.
   */
  const resetRoute = useCallback(() => {
    setManualEdges([])
    setSelectedEdgeIds([])
    setVisitedAddresses(new Set())
    setCurrentEndNode(null)
    setSelectionMessage(null)
  }, [])

  return {
    manualEdges,
    selectedEdgeIds,
    visitedAddresses,
    currentEndNode,
    selectionMessage,
    handleEdgeSelect,
    undoLastEdge,
    resetRoute
  }
}

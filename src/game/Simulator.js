// src/game-logic/TourSimulator.js

// Helper function to calculate the distance between two points
function calculateDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    // Simplified distance --> 1 pixel = 0.01 km
    return Math.sqrt(dx * dx + dy * dy) * 0.01;
}

/**
 * Runs the tour simulation based on the planned route and vehicle
 * @param {Array<string>} plannedRoute - Array of delivery point IDs
 * @param {object} tourData - The full tour data including depot and delivery points
 * @returns {number} The total distance of the tour in km
 */
export function runSimulation(plannedRoute, tourData) {
    let totalDistance = 0;
    let lastPoint = tourData.depot;

    // Calculate distance from depot to the first point
    const firstPointId = plannedRoute[0];
    const firstPoint = tourData.deliveryPoints.find(p => p.id === firstPointId);
    totalDistance += calculateDistance(lastPoint, firstPoint);
    lastPoint = firstPoint;

    // Calculate distance between subsequent points
    for (let i = 1; i < plannedRoute.length; i++) {
        const currentPointId = plannedRoute[i];
        const currentPoint = tourData.deliveryPoints.find(p => p.id === currentPointId);
        totalDistance += calculateDistance(lastPoint, currentPoint);
        lastPoint = currentPoint;
    }

    // Calculate distance from the last point back to the depot
    totalDistance += calculateDistance(lastPoint, tourData.depot);

    return totalDistance;
}
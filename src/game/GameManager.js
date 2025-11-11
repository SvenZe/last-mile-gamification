// src/game-logic/GameManager.js
import { STARTING_BUDGET, VEHICLES, AVG_SPEED_KMPH } from '../data/constants.js';
import { updateBudgetDisplay } from '../components/BudgetDisplay.js';
import { hideDecisionPopup } from '../components/DecisionPopup.js';
import { runSimulation } from './Simulator.js'; 
import { showESGDashboard } from '../components/ESGDashboard.js';

const listeners = [];
let tourData = null;

export function subscribe(callback) {
  listeners.push(callback);
}

function notify() {
  listeners.forEach(callback => callback());
}

const gameState = {
  budget: STARTING_BUDGET,
  selectedVehicle: null,
  plannedRoute: [],
  currentPhase: 'decision',
};

export function initGameManager() {
  console.log('[GameManager.js] 3. initGameManager() called.');
  updateBudgetDisplay(gameState.budget);
  // Fetch tour data for the simulator
  fetch('/src/assets/data/tourSetup.json')
    .then(res => res.json())
    .then(data => {
        tourData = data;
        console.log('[GameManager.js] Tour data loaded.');
    });
}

export function addPointToRoute(pointId) {
  if (gameState.currentPhase !== 'planning') return;
  if (gameState.plannedRoute.length >= tourData.deliveryPoints.length) return; // Prevent adding more points than exist

  if (!gameState.plannedRoute.includes(pointId)) {
    gameState.plannedRoute.push(pointId);
    console.log('[GameManager.js] Route updated:', gameState.plannedRoute);
    notify();
  }
  
  // Enable simulate button only when all points are in the route
  if (gameState.plannedRoute.length === tourData.deliveryPoints.length) {
      document.getElementById('simulate-button').disabled = false;
  }
}

export function selectVehicle(vehicleId) {
  if (gameState.currentPhase !== 'decision') return;
  const vehicle = VEHICLES[vehicleId];
  if (!vehicle) return;

  gameState.budget -= vehicle.initialCost;
  gameState.selectedVehicle = vehicle;
  gameState.currentPhase = 'planning';
  
  updateBudgetDisplay(gameState.budget);
  hideDecisionPopup();
  notify();
}

export function simulateTour() {
    if (gameState.currentPhase !== 'planning' || !gameState.selectedVehicle) return;
    
    console.log('[GameManager.js] Starting simulation...');
    gameState.currentPhase = 'report';
    
    const totalDistance = runSimulation(gameState.plannedRoute, tourData);
    
    const vehicle = gameState.selectedVehicle;
    const operationalCost = totalDistance * vehicle.costPerKm;
    const report = {
        totalDistance: totalDistance,
        totalCO2: (totalDistance * vehicle.co2PerKm) / 1000, // Convert g to kg
        tourDuration: totalDistance / AVG_SPEED_KMPH,
        punctuality: 100, // Placeholder for now
        operationalCost: operationalCost,
        finalBudget: gameState.budget - operationalCost,
    };

    console.log('[GameManager.js] Report generated:', report);

    showESGDashboard(report);
}

export function getGameState() {
  return gameState;
}
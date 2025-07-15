// src/main.js
import './style.css';

import { initMapView } from './map/MapView.js';
import { initGameManager, simulateTour } from './game-logic/GameManager.js';
import { initDecisionPopup } from './components/DecisionPopup.js';

function startApp() {
  console.log('[main.js] 1. startApp() called.');
  initMapView();
  initGameManager();
  initDecisionPopup();
  
  // Set up the simulate button
  const simulateButton = document.getElementById('simulate-button');
  simulateButton.disabled = true; // Disabled until route is complete
  simulateButton.addEventListener('click', simulateTour);

  console.log('[main.js] 5. startApp() finished.');
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[main.js] 0. DOMContentLoaded event fired. Starting application...');
    startApp();
});
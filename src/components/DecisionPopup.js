// src/components/DecisionPopup.js
import { VEHICLES } from '../data/constants.js';
import { selectVehicle } from '../game/GameManager.js';

export function initDecisionPopup() {
  console.log('[DecisionPopup.js] 4. initDecisionPopup() called.');
  const choicesContainer = document.getElementById('vehicle-choices');
  
  if (!choicesContainer) {
    console.error('[DecisionPopup.js] FATAL ERROR: vehicle-choices element NOT found in DOM.');
    return;
  }
  console.log('[DecisionPopup.js]   - vehicle-choices element found.');

  choicesContainer.innerHTML = ''; 

  for (const vehicleKey in VEHICLES) {
    const vehicle = VEHICLES[vehicleKey];
    const button = document.createElement('button');
    button.className = 'p-4 border rounded-lg shadow hover:bg-blue-100 transition text-left w-full';
    button.innerHTML = `
      <h3 class="font-bold text-lg">${vehicle.name}</h3>
      <p>Kosten: ${vehicle.initialCost.toLocaleString()} €</p>
      <p>CO₂/km: ${vehicle.co2PerKm} g/km</p>
      <p>Kapazität: ${vehicle.capacity} m³</p>
    `;

    button.addEventListener('click', () => {
      selectVehicle(vehicleKey);
    });
    
    choicesContainer.appendChild(button);
  }
}

export function hideDecisionPopup() {
  console.log('[DecisionPopup.js] Hiding decision pop-up...');
  const popupElement = document.getElementById('decision-popup');
  if (popupElement) {
    popupElement.classList.add('hidden');
  } else {
    console.error('[DecisionPopup.js] ERROR: decision-popup element not found when trying to hide.');
  }
}
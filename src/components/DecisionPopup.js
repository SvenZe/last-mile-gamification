// src/components/DecisionPopup.js
import { VEHICLES } from '../data/constants.js';
import { selectVehicle } from '../game/GameManager.js';

export function initDecisionPopup() {
  const choicesContainer = document.getElementById('vehicle-choices');
  
  if (!choicesContainer) {
    return;
  }

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
  const popupElement = document.getElementById('decision-popup');
  if (popupElement) {
    popupElement.classList.add('hidden');
  }
}
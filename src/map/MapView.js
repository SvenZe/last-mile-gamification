// src/map/MapView.js
import { getGameState, subscribe, addPointToRoute } from '../game/GameManager.js';
import tourData from '../data/tourSetup.json';

let canvas = null;
let ctx = null;
// tourData is now statically imported from JSON via Vite

function getMousePos(canvasEl, evt) {
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

export function renderMap() {
  if (!tourData || !canvas || !ctx) return; 

  const { plannedRoute } = getGameState();
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  tourData.deliveryPoints.forEach(point => {
    const color = plannedRoute.includes(point.id) ? 'orange' : 'blue';
    drawPoint(point, color, 'circle');
  });

  drawPoint(tourData.depot, 'green', 'square');

  if (plannedRoute.length > 0) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tourData.depot.x, tourData.depot.y);
    plannedRoute.forEach(pointId => {
      const point = tourData.deliveryPoints.find(p => p.id === pointId);
      if (point) {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  }
}

function drawPoint(point, color, shape) {
  ctx.fillStyle = color;
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  
  if (shape === 'square') {
    ctx.fillRect(point.x - 10, point.y - 10, 20, 20);
  } else {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  ctx.fillStyle = 'black';
  ctx.fillText(point.name, point.x, point.y - 15);
  if(point.timeWindow) {
    ctx.fillText(point.timeWindow, point.x, point.y + 25);
  }
}

export async function initMapView() {
  console.log('[MapView.js] 2. initMapView() called.');
  canvas = document.getElementById('game-canvas');
  if (!canvas) {
      console.error('[MapView.js] FATAL ERROR: Canvas element not found in DOM.');
      return;
  }
  ctx = canvas.getContext('2d');
  console.log('[MapView.js]   - Canvas element found.');

  try {
    subscribe(renderMap);
    renderMap();

    canvas.addEventListener('click', (event) => {
      const mousePos = getMousePos(canvas, event);
      for (const point of tourData.deliveryPoints) {
        const dx = mousePos.x - point.x;
        const dy = mousePos.y - point.y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          addPointToRoute(point.id);
          break;
        }
      }
    });
  } catch (error) {
    console.error('[MapView.js] Could not render the map:', error);
  }
}
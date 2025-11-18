/**
 * constants.js
 * 
 * Core numbers that define how the game works. Tweak these to adjust
 * difficulty or make the simulation more/less realistic.
 */

// Every kilometer costs this much in overhead (staff, rent, admin)
export const FIXED_COST_PER_KM = 10.23

// Company size
export const FLEET_SIZE = 8
export const WORKING_DAYS_PER_YEAR = 250
export const TOURS_PER_DAY = 12
export const TOTAL_FLEET_KM_PER_YEAR = 150000

// Simulation timing
export const CITY_SPEED_KMH = 30
export const STOP_TIME_MINUTES = 7
export const CONSTRUCTION_DELAY_MINUTES = 15

// Legacy vehicle data (kept for old code)
// Real vehicle specs are in vehicles.js now
export const VEHICLES = {
  DIESEL: {
    id: 'diesel',
    name: 'Diesel Transporter',
    initialCost: 0,
    co2PerKm: 198,
    costPerKm: 0.14,
    capacity: 11.0,
  },
  HYBRID: {
    id: 'hybrid',
    name: 'Hybrid Transporter',
    initialCost: 58000,
    co2PerKm: 127,
    costPerKm: 0.12,
    capacity: 4.0,
  },
  ELECTRIC: {
    id: 'electric',
    name: 'E-Transporter',
    initialCost: 65000,
    co2PerKm: 0,
    costPerKm: 0.09,
    capacity: 11.0
  },
};

// Equipment options (not used in the prototype yet)
export const EQUIPMENT = {
  ROUTE_SOFTWARE: {
    id: 'route-software',
    name: 'Route Planning Software',
    cost: 5000,
    description: 'Shows the optimal route, reducing travel time and kilometers.',
  },
  GPS_TRACKER: {
    id: 'gps-tracker',
    name: 'GPS Tracker',
    cost: 500,
    description: 'Enables dynamic reaction to unforeseen events like traffic jams.',
  },
  CO2_SOFTWARE: {
    id: 'co2-software',
    name: 'CO2 Recording Software',
    cost: 1500,
    description: 'Provides accurate and traceable CO2 data for the ESG report.',
  },
};
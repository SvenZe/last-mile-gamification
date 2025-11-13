/**
 * Game constants for last-mile delivery simulation.
 * 
 * These values define the operational parameters used across the game:
 * - Company overhead costs (salaries, rent)
 * - Fleet operations (working days, tours per day)
 * - Route simulation (speed, stop times)
 */

// Company-wide fixed overhead (allocated across all tours)
export const FIXED_COST_PER_KM = 10.23  // €/km for salaries + rent

// Fleet and operations
export const FLEET_SIZE = 8
export const WORKING_DAYS_PER_YEAR = 250
export const TOURS_PER_DAY = 12  // 5 morning shift + 7 afternoon shift
export const TOTAL_FLEET_KM_PER_YEAR = 150000

// Route simulation parameters
export const CITY_SPEED_KMH = 30  // average urban driving speed
export const STOP_TIME_MINUTES = 5  // time per address delivery
export const CONSTRUCTION_DELAY_MINUTES = 15  // extra time for detours

// Legacy vehicle data - kept for backwards compatibility
// Note: Active vehicle specs are now in src/data/vehicles.js
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
    co2PerKm: 0
    costPerKm: 0.09, // Calculated from electricity price and consumption: (30 kWh/100km * €0.32/kWh) / 100 km = €0.09 per km
    capacity: 11.0, // Cargo volume in cubic meters (m3)
  },
};

// Equipment data based on the concept document
export const EQUIPMENT = {
  ROUTE_SOFTWARE: {
    id: 'route-software',
    name: 'Route Planning Software',
    cost: 5000, // Represents an annual license fee
    description: 'Shows the optimal route, reducing travel time and kilometers.',
  },
  GPS_TRACKER: {
    id: 'gps-tracker',
    name: 'GPS Tracker',
    cost: 500, // Represents hardware and 1-year service subscription
    description: 'Enables dynamic reaction to unforeseen events like traffic jams.',
  },
  CO2_SOFTWARE: {
    id: 'co2-software',
    name: 'CO2 Recording Software',
    cost: 1500, // Represents a specialized software license
    description: 'Provides accurate and traceable CO2 data for the ESG report.',
  },
};
// src/game-logic/constants.js

// General game parameters
export const STARTING_BUDGET = 75000;
export const AVG_SPEED_KMPH = 30; // Average speed in kilometers per hour
export const COST_PER_MINUTE_IDLE = 0.75; // Cost penalty for idling in traffic

// Vehicle data based on the concept document
export const VEHICLES = {
  DIESEL: {
    id: 'diesel',
    name: 'Diesel Transporter',
    initialCost: 0, // Baseline aquisition costs
    co2PerKm: 198, // Realistic WLTP value
    costPerKm: 0.14, // Calculated from fuel consumption: (8.0 l/100km * €1.75/l) / 100 km = €0.14 per km 
    capacity: 11.0, // Cargo volume in cubic meters (m3)
  },
  HYBRID: {
    id: 'hybrid',
    name: 'Hybrid Transporter',
    initialCost: 58000, // Baseline acquisition costs
    co2PerKm: 127, // Official WLTP value
    costPerKm: 0.12, // Calculated from fuel consumption ((2.5 l/100 km * € 1.75/l) + (25 kWh/100 km * €0.32/kWh)) / 100 km = €0.12 per km
    capacity: 4.0, // Cargo volume in cubic meters (m3)
  },
  ELECTRIC: {
    id: 'electric',
    name: 'E-Transporter',
    initialCost: 65000, // Baseline acquisition costs
    co2PerKm: 0, // No direct tailpipe emissions
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
    name: 'GPS Tracker', // [cite: 113]
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
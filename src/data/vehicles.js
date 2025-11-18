/**
 * vehicles.js
 * 
 * Vehicle definitions with costs, fuel consumption, and emissions.
 * The costPerKm here is just the vehicle's direct costs (fuel, maintenance).
 * The game adds another €10.23/km for overhead (drivers, admin, facilities).
 */
export const vehicles = [
  { 
    id: 'diesel', 
    name: 'Diesel-Transporter', 
    
    // Fixed yearly costs
    depreciationPerYear: 7000,
    insurancePerYear: 1500,
    taxPerYear: 400,
    
    // Fuel specs
    fuelConsumption: 9.2,      // L/100km
    fuelUnit: 'l',
    fuelPrice: 1.65,           // €/L
    fuelType: 'Diesel',
    
    // Per-kilometer costs and emissions
    costPerKm: 0.57,           // Vehicle operating costs
    co2PerKm: 0.242,           // kg CO2 per km
    
    // Cargo capacity
    capacityM3: 12.75,
    maxBoxes: 400 
  },
  { 
    id: 'hybrid', 
    name: 'Hybrid-Transporter', 
    
    // Annual fixed costs
    depreciationPerYear: 7500,
    insurancePerYear: 1500,
    taxPerYear: 50,            // lower tax for hybrid
    
    // Dual fuel consumption
    fuelConsumption: 2.3,      // liters per 100 km
    fuelUnit: 'l',
    fuelPrice: 1.79,           // € per liter (gasoline)
    fuelType: 'Benzin',
    electricConsumption: 15,   // kWh per 100 km
    electricPrice: 0.27,       // € per kWh
    
    // Operating costs and emissions
    costPerKm: 0.50,           // lowest variable costs
    co2PerKm: 0.036,           // significantly lower emissions
    
    // Cargo capacity (smaller due to battery)
    capacityM3: 7, 
    maxBoxes: 185 
  },
  { 
    id: 'electric', 
    name: 'E-Transporter', 
    
    // Annual fixed costs
    depreciationPerYear: 11000,  // highest depreciation
    insurancePerYear: 1500,
    taxPerYear: 0,               // tax-free
    
    // Energy consumption
    electricConsumption: 27,     // kWh per 100 km
    electricPrice: 0.27,         // € per kWh
    
    // Operating costs and emissions
    costPerKm: 0.65,             // higher maintenance for electric
    co2PerKm: 0,                 // zero direct emissions
    
    // Cargo capacity
    capacityM3: 12.75, 
    maxBoxes: 400 
  }
]

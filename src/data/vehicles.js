/**
 * Vehicle fleet configuration for last-mile delivery operations.
 * 
 * Each vehicle has fixed annual costs (depreciation, insurance, tax) and 
 * variable costs per km (maintenance, wear). The costPerKm represents the
 * vehicle-specific variable costs, which are added to the company's fixed
 * overhead of 10.23 €/km (salaries + rent) to get total cost per km.
 * 
 * Fuel/energy consumption and CO2 emissions vary significantly between types.
 * Capacity constraints determine how many packages can be loaded per tour.
 */
export const vehicles = [
  { 
    id: 'diesel', 
    name: 'Diesel-Transporter', 
    
    // Annual fixed costs
    depreciationPerYear: 7000,
    insurancePerYear: 1500,
    taxPerYear: 400,
    
    // Fuel consumption
    fuelConsumption: 9.2,      // liters per 100 km
    fuelUnit: 'l',
    fuelPrice: 1.65,           // € per liter
    fuelType: 'Diesel',
    
    // Operating costs and emissions
    costPerKm: 0.57,           // variable costs (maintenance, wear)
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

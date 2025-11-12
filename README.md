# Last-Mile Gamification - Lernstufe 3

Ein interaktives Serious Game für die Tourenplanung in der Last-Mile-Logistik mit ESG-Bewertung (Ökologie, Ökonomie, Soziales).

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Development Server starten
```bash
npm run dev
```
Der Dev-Server startet auf `http://localhost:5173` (oder einem anderen verfügbaren Port).

### Build für Produktion
```bash
npm build
```

## 📁 Projektstruktur

```
last-mile-gamification/
├── src/
│   ├── components/          # UI-Komponenten
│   │   ├── BudgetDisplay.js
│   │   ├── DecisionPopup.js
│   │   ├── ESGDashboard.jsx
│   │   ├── ModeSelector.jsx
│   │   ├── SimulationButton.js
│   │   ├── ToastMessage.js
│   │   └── VehicleSelector.jsx
│   ├── map/                 # Karten-Rendering
│   │   ├── MapRender.js
│   │   └── MapView.jsx
│   ├── game/                # Spiellogik & Algorithmen
│   │   ├── GameManager.js
│   │   ├── ScoreCaluclator.js
│   │   └── Simulator.js
│   ├── algorithms/          # Optimierungsalgorithmen
│   │   ├── applyRouteContstraints.js
│   │   ├── distance.js
│   │   ├── nearestInsertion.js
│   │   ├── nearestNeighbor.js
│   │   └── twoOpt.js
│   ├── data/                # Daten & Konfiguration
│   │   ├── baselineMetrics.json
│   │   ├── constants.js
│   │   ├── equipment.json
│   │   ├── tourSetup.json   # Straßennetz (54 Knoten, 134 Kanten)
│   │   └── vehicles.js
│   ├── state/               # State Management
│   │   ├── EventBus.js
│   │   ├── GameState.js
│   │   └── PhaseController.js
│   ├── utils/               # Hilfsfunktionen
│   │   ├── formatMoney.js
│   │   ├── formatTime.js
│   │   ├── mathHelpers.js
│   │   └── randomSpeed.js
│   ├── App.jsx              # Hauptkomponente
│   ├── main.jsx             # Entry Point
│   └── style.css            # Globale Styles
├── scripts/
│   └── buildTourSetup.cjs   # Tour-Generator Script
├── index.html               # HTML Entry
├── package.json
├── vite.config.js           # Vite Konfiguration
├── tailwind.config.cjs      # Tailwind CSS Konfiguration
└── postcss.config.cjs       # PostCSS Konfiguration
```

## 🎮 Spielmechanik

### Lernstufe 3: Technologische Unterstützung bei der Planung

**Ziel:** Optimale Tourenplanung mit ESG-Kriterien (Ökologie 40%, Ökonomie 35%, Soziales 25%)

**Modi:**
- **Manuell:** Selbst Kanten auswählen und Route planen
- **Automatisch:** Algorithmus übernimmt die Tourenplanung

**Features:**
- 54 Kreuzungen, 134 Straßenverbindungen (orthogonal)
- 18 Lieferadressen zufällig verteilt
- Fahrzeugauswahl (Diesel, Elektro, Cargo-Bike)
- Ausrüstung (Geräte, Ladehilfen)
- Baustellen-Simulation (3 blockierte Straßen)
- Echtzeit ESG-Bewertung

## 🛠️ Technologie-Stack

- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.2
- **Styling:** Tailwind CSS 4.1.11
- **Rendering:** Canvas API (Custom Map Rendering)

## 📊 ESG-Bewertung

- **Ökologie (40%):** CO₂-Emissionen, Energieverbrauch
- **Ökonomie (35%):** Kosten, Effizienz
- **Soziales (25%):** Lärmbelastung, Arbeitsbedingungen

## 📝 Scripts

```bash
npm run dev           # Dev-Server starten
npm run build         # Production Build
npm run preview       # Production Preview
npm run build:tour    # Straßennetz neu generieren
```

## 🎯 Game Design Dokument (GDD)

Basierend auf:
- **Rehfeld 2020:** Strukturiertes Game Design
- **Fünf-Ebenen-Modell nach Gimpel 2017:** Lernzielerreichung durch Gamification

## 🐛 Bekannte Einschränkungen

- Nur Lernstufe 3 implementiert (6 weitere Stufen geplant)
- Straßennetz ist statisch (tourSetup.json)
- Keine Persistenz (kein Backend)

## 📄 Lizenz

ISC License

## 👥 Kontakt

Repository: [github.com/SvenZe/last-mile-gamification](https://github.com/SvenZe/last-mile-gamification)

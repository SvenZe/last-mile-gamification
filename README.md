# Last-Mile Gamification – Lernstufe 3

Ein interaktives Lernspiel für Tourenplanung in der letzten Meile. Studenten können hier selbst Hand anlegen oder schauen, wie Algorithmen das Problem lösen – und am Ende gibt's eine ESG-Bewertung nach ökologischen, ökonomischen und sozialen Kriterien.

## Los geht's

### Installation
```bash
npm install
```

### Entwicklungsserver
```bash
npm run dev
```
Läuft dann auf `http://localhost:5173` (oder einem anderen freien Port).

### Production Build
```bash
npm run build
```

## Wie es funktioniert

Das Spiel simuliert einen typischen Tag in der Paketzustellung. 18 Kunden warten auf ihre Lieferung, und du musst entscheiden: Planst du die Route selbst oder vertraust du auf einen Algorithmus?

### Spielablauf
1. **Story**: Kurze Einführung ins Szenario – Baustellen in der Stadt, Zeitdruck, die üblichen Logistik-Probleme eben
2. **Fahrzeugwahl**: Diesel-Transporter, Hybrid-Transporter oder Elektrotransporter?
3. **Planungsmodus**:
   - **Manuell**: Du klickst dich durch die Straßen und baust deine Route Kante für Kante
   - **Automatisch**: Lin-Kernighan-Helsgaun Algorithmus findet die optimale Route
4. **Simulation**: Deine Route wird durchgespielt – Kilometer, Kosten, CO₂, Zustellquote
5. **Ergebnis**: ESG-Score zeigt, wie gut du warst (oder wie gut der Algorithmus war)

## Was macht das Spiel interessant?

- **Echte Baustellen**: 4 Straßen sind gesperrt – das bedeutet Umwege und Verzögerungen
- **ESG-Bewertung**: Nicht nur Kosten zählen, auch Umwelt (40%) und Kundenservice (25%)
- **Vergleich Mensch vs. Maschine**: Kannst du den Algorithmus schlagen?
- **Rückgängig-Button**: Fehler passieren – einfach einen Schritt zurück

## Routing-Algorithmus

Das Spiel nutzt den **Lin-Kernighan-Helsgaun (LKH) Algorithmus** – einen der besten Ansätze für das Traveling Salesman Problem. 

### Wie funktioniert's?
1. **Initiale Lösungen**: Clarke-Wright Heuristic + 18 Nearest-Neighbor Varianten + 2000 zufällige Touren
2. **Optimierung**: Variable k-opt Moves (2-opt bis 5-opt) mit Candidate Sets
3. **Ergebnis**: Findet konsistent die optimale Route

Der Algorithmus arbeitet mit echten Straßendistanzen (Dijkstra-Pathfinding im Netzwerk) statt Luftlinie.

## Projektstruktur

```
src/
├── algorithms/         # TSP-Solver (LKH, Clarke-Wright, 2-Opt, Pathfinding)
├── components/         # UI-Bausteine (Fahrzeugwahl, ESG-Dashboard, etc.)
├── map/               # Canvas-basierte Karten-Darstellung
├── game/              # Spiellogik und Simulation
├── data/              # Straßennetz, Fahrzeuge, Baseline-Metriken
├── App.jsx            # Hauptkomponente mit Phasen-Steuerung
└── main.jsx           # Einstiegspunkt
```

## Technische Details

Das Spiel läuft komplett im Browser, kein Backend nötig. Die Karte wird mit Canvas gerendert (schneller als SVG bei vielen Objekten). Das Straßennetz ist ein einfaches Gitter mit 54 Kreuzungen und 134 Verbindungen – realitätsnah genug für's Lernen, aber nicht so komplex dass es unübersichtlich wird.

### Algorithmen

- **Nearest Insertion**: Baut die Tour schrittweise auf, indem immer die nächste Adresse an der besten Stelle eingefügt wird
- **2-Opt**: Optimiert die Tour nachträglich durch edge-swapping – probiert verschiedene Varianten durch bis nichts mehr besser wird

### ESG-Berechnung

Die Bewertung vergleicht deine Route mit einem Baseline-Szenario:
- **Umwelt (40%)**: CO₂-Emissionen im Verhältnis zur Distanz
- **Ökonomie (35%)**: Gesamtkosten (Fix + variabel)
- **Soziales (25%)**: Zustellquote (werden alle Kunden rechtzeitig beliefert?)

Baustellen reduzieren die Zustellquote um ca. 8% pro Baustelle, weil Zeitfenster nicht eingehalten werden können.

## Tech-Stack

- React 19.2 (weil's einfach ist und schnell läuft)
- Vite 7.2 (super schneller Build-Tool)
- Tailwind CSS 4.1 (für schnelles Styling)
- Vanilla Canvas (für die Karte)

## Entwicklung

Das Projekt nutzt Hot Module Replacement – Änderungen im Code werden sofort sichtbar ohne Reload. Die Algorithmen sind in `src/algorithms/` ausgelagert und gut kommentiert, falls man mal nachschauen will wie sowas funktioniert.

### Tipps zum Code
- `App.jsx` steuert die Spielphasen und verwaltet den State
- `MapView.jsx` zeichnet alles und kümmert sich um Klicks
- `GameManager.js` führt die Simulation durch und rechnet ESG-Scores aus
- Die Algorithmen sind bewusst einfach gehalten (kein fancy Dijkstra oder so), damit man sie nachvollziehen kann

## Lizenz & Verwendung

Das Projekt ist für Lehrzwecke gedacht.

---

_Hinweis: Das ist der Prototyp für die Lernstufe 3.

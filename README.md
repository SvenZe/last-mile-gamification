# Tourenplaner für die Logistik

https://svenze.github.io/last-mile-gamification/
Prototyp eines webbasierten Serious Game für die Vermittlung von ESG-Kompetenzen in der Last-Mile-Logistik. Entwickelt im Rahmen einer Masterarbeit an der Technischen Hochschule Augsburg.

## Über den Prototyp

Dieser Prototyp implementiert die dritte Lernstufe eines mehrstufigen Serious Game-Konzepts zur ESG-Berichterstattung. Im Fokus steht die Tourenplanung für einen mittelständischen Getränkehändler in Augsburg, bei dem verschiedene Planungsansätze – manuell und algorithmisch – miteinander verglichen werden können.

### Das Szenario

Die fiktive Vini Augusta GmbH steht vor einer typischen Herausforderung in der urbanen Logistik: 18 Kunden müssen an einem Vormittag beliefert werden, während gleichzeitig mehrere Baustellen den Verkehr behindern und sich die Verkehrslage zur Rush-Hour verschlechtert. Als Disponent müssen Sie entscheiden, wie Sie die Tour planen – per Hand oder algorithmisch – und welches Fahrzeug Sie einsetzen.

Die Fahrzeugwahl hat direkten Einfluss auf drei Dimensionen:
- Betriebskosten (Diesel günstiger im Verbrauch, Elektro höhere Fixkosten)
- CO₂-Emissionen (Elektro emissionsfrei, Diesel am stärksten belastend)
- Fahrgeschwindigkeit (Hybrid am schnellsten, Elektro durch Gewicht langsamer)

Nach der Simulation zeigt das ESG-Dashboard, wie gut Ihre Planung im Vergleich zu einer Baseline abschneidet. Die Baseline repräsentiert einen durchschnittlichen Arbeitstag mit 27 km Fahrstrecke, 6,5 kg CO₂-Ausstoß und 85% pünktlicher Zustellung.

## Funktionsumfang

Der Prototyp umfasst zwei Planungsmodi und eine Simulation mit anschließender ESG-Bewertung.

### Manuelle Planung

Sie klicken sich Ihre Route auf einer Karte zusammen. Jeder Klick auf ein Straßensegment erweitert die Tour. Die Herausforderung besteht darin, alle Kunden zu erreichen und dabei gesperrte Baustellen zu umfahren. Eine Rückgängig-Funktion erlaubt Korrekturen, falls Sie in eine Sackgasse geraten.

### Automatische Planung

Der Lin-Kernighan-Helsgaun-Algorithmus übernimmt die Optimierung. Im Hintergrund werden verschiedene Heuristiken kombiniert: Clarke-Wright Savings für eine erste Lösung, Nearest-Neighbor-Varianten für Diversität und variable k-opt-Moves für die Feinoptimierung. Das Ergebnis ist konsistent nahe am Optimum.

### Fahrzeuge

Drei Fahrzeugtypen stehen zur Auswahl:

**Diesel-Transporter**  
10 L/100km, 242 g CO₂/km, 0,57 €/km

**Hybrid-Transporter**  
7,5 L/100km, 194 g CO₂/km, 0,50 €/km

**Elektro-Transporter**  
25 kWh/100km, 0 g CO₂/km, 0,65 €/km

### Verkehrssimulation

Das Verkehrsmodell bildet die Rush-Hour zwischen 7 und 10 Uhr ab. Um 8 Uhr erreicht die Verkehrsdichte ihren Höhepunkt mit 85% Auslastung. Hauptstraßen sind stärker betroffen als Nebenstraßen. Während der Planung arbeitet das Modell deterministisch, in der Simulation kommt leichte Zufallsvariation hinzu.

### ESG-Bewertung

Nach der Simulation werden drei Scores berechnet:

**Environment (40%)**  
Vergleich der CO₂-Emissionen mit der Baseline

**Economy (35%)**  
Vergleich der Gesamtkosten mit der Baseline

**Social (25%)**  
Vergleich der Pünktlichkeitsrate mit der Baseline

Die gewichtete Summe ergibt den Gesamt-Score. Ein positiver Wert bedeutet, dass Sie besser als die Baseline abgeschnitten haben.

## Installation

Voraussetzungen: Node.js 18+ und npm.

```bash
git clone https://github.com/SvenZe/last-mile-gamification.git
cd last-mile-gamification
npm install
npm run dev
```

Die Anwendung läuft dann auf `http://localhost:5173`.

Weitere Befehle:

```bash
npm run build           # Production Build
npm test                # 136 Tests ausführen
npm run test:ui         # Tests im Browser
npm run test:coverage   # Coverage Report
npm run build:tour      # Neue Karte generieren
```

## Ablauf

Der Prototyp führt durch fünf Phasen:

**1. Einführung**  
Kurze Vorstellung der Vini Augusta GmbH und des Tagesauftrags: 18 Kunden zwischen 7 und 10 Uhr beliefern, vier Baustellen umfahren.

**2. Fahrzeugauswahl**  
Wahl zwischen Diesel, Hybrid oder Elektro. Die Entscheidung wirkt sich später auf alle drei ESG-Dimensionen aus – Umwelt mit 40%, Wirtschaft mit 35%, Soziales mit 25% Gewichtung.

**3. Planung**  
Entweder manuell per Klick auf der Karte oder automatisch durch den Algorithmus. Im manuellen Modus sehen Sie fortlaufend, wie viele Kunden noch fehlen. Im automatischen Modus läuft die Optimierung durch und zeigt das Ergebnis.

**4. Simulation**  
Die Route wird durchgespielt. Das Fahrzeug bewegt sich über die Karte, hält an Kundenstandorten und berechnet laufend Metriken wie Distanz, Zeit, Kosten und Emissionen. Bei Baustellen werden automatisch Umwege berechnet.

**5. Auswertung**  
Das ESG-Dashboard zeigt die Performance in allen drei Dimensionen. Sie sehen, ob Sie besser oder schlechter als die Baseline abgeschnitten haben und wo Verbesserungspotenzial liegt.

## Technische Umsetzung

Der Prototyp basiert auf React 19, Vite 7 und Tailwind CSS 4. Die Karte wird auf einem Canvas gerendert statt mit SVG, was bei vielen Knoten und Kanten deutlich performanter ist. 136 Tests decken Utils, Algorithmen und Game Logic ab.

### Verwendete Algorithmen

**Clarke-Wright Savings**  
Klassische Heuristik für das Vehicle Routing Problem. Berechnet die Ersparnis beim Zusammenlegen von Einzelfahrten und priorisiert Verbindungen mit hoher Ersparnis.

**Lin-Kernighan-Helsgaun**  
TSP-Solver mit variabler k-opt Local Search. Prüft systematisch 2-opt, 3-opt, 4-opt und 5-opt Moves und nutzt Candidate Sets zur Beschränkung des Suchraums. Liefert nahezu optimale Lösungen in Echtzeit.

**Nearest Neighbor**  
Greedy-Heuristik, die vom Depot aus immer zum nächstgelegenen noch nicht besuchten Kunden fährt. Wird mit verschiedenen Startknoten ausgeführt, um Diversität zu erzeugen.

**2-Opt**  
Lokale Verbesserungsheuristik, die zwei Kanten in der Route tauscht, wenn dadurch die Gesamtdistanz sinkt. Entfernt vor allem Kreuzungen.

**A\***  
Findet kürzeste Wege unter Berücksichtigung von gesperrten Straßen. Die Heuristik beschleunigt die Suche erheblich gegenüber purem Dijkstra.

**Dijkstra**  
Berechnet die Distanzmatrix zwischen allen Knotenpaaren. Liefert realistische Straßendistanzen statt Luftlinie.

**Verkehrsmodell**  
Simuliert zeitabhängige Verkehrsdichte mit Höhepunkt um 8 Uhr (85% Auslastung). Hauptstraßen werden stärker verlangsamt als Nebenstraßen. In der Planungsphase deterministisch, in der Simulation mit leichter Zufallsvariation.

### Architektur

```
src/
├── algorithms/         Routing und Optimierung
│   ├── clarkeWright.js
│   ├── linKernighanHelsgaun.js
│   ├── nearestNeighbor.js
│   ├── twoOpt.js
│   ├── pathfinding.js
│   ├── networkDistance.js
│   ├── trafficModel.js
│   └── distance.js
├── components/         React-Komponenten
│   ├── phases/
│   ├── ESGDashboard.jsx
│   ├── VehicleSelector.jsx
│   ├── ModeSelector.jsx
│   └── TrafficTimeSlider.jsx
├── data/              Konfiguration und Daten
│   ├── tourSetup.json
│   ├── vehicles.js
│   ├── baselineMetrics.json
│   ├── equipment.json
│   └── constants.js
├── game/              Business Logic (framework-unabhängig)
│   ├── GameManager.js
│   ├── Simulator.js
│   ├── RouteValidator.js
│   └── ManualRouteHandler.js
├── hooks/             React Hooks
│   ├── useAutoRoute.js
│   ├── useManualRoute.js
│   └── useRouteAdjustment.js
├── map/               Canvas-Rendering
│   ├── MapView.jsx
│   ├── MapRenderer.js
│   ├── MapInteraction.js
│   └── MapLegend.jsx
├── services/
│   └── AutoRouteGenerator.js
├── state/             State Management
│   ├── GameState.js
│   ├── PhaseController.js
│   └── EventBus.js
├── utils/             Hilfsfunktionen
│   ├── mathHelpers.js
│   ├── nodeHelpers.js
│   ├── edgeHelpers.js
│   ├── formatMoney.js
│   ├── formatTime.js
│   └── randomSpeed.js
└── App.jsx
```

Die Trennung zwischen `game/` (Pure Functions) und `hooks/` (React State) erlaubt isoliertes Testen der gesamten Business Logic ohne React Testing Library.

### Daten

Die Karte basiert auf einem vereinfachten Straßennetz mit etwa 50 Knoten und 100 Kanten. 18 Kunden werden zufällig verteilt, jeder mit einem individuellen Zeitfenster zwischen 60 und 120 Minuten. Vier Baustellen blockieren zufällig ausgewählte Straßen.

Mit `npm run build:tour` kann eine neue Karte generiert werden. Die Baseline-Metriken (27 km, 291,60 €, 6,5 kg CO₂, 85% Pünktlichkeit) bleiben konstant.

### Tests

136 Tests decken Utils (94), Algorithmen (23) und Game Logic (19) ab:

```bash
npm test              # Watch-Modus
npm run test:ui       # Browser-UI
npm run test:coverage # Coverage
```

## Kontext

Dieser Prototyp ist Teil meiner Masterarbeit "Entwicklung eines Gamification-Ansatzes für die ESG-Berichterstattung" an der Technischen Hochschule Augsburg (Betreuer: Prof. Dr. Jana Görmer-Redding, Prof. Dr. Claudia Reuter). Die Arbeit untersucht, ob Serious Games geeignet sind, um ESG-Kompetenzen zu vermitteln, und welche Spielmechaniken dabei besonders wirksam sind.

Das Gesamtkonzept umfasst sieben Lernstufen, von der Einführung in ESG-Grundlagen bis zur strategischen Integration in Geschäftsprozesse. Dieser Prototyp implementiert die dritte Stufe: technologische Unterstützung bei der Tourenplanung. Die Idee ist, dass Lernende hier erstmals mit algorithmischer Optimierung in Kontakt kommen und ihre eigene manuelle Planung mit der des Algorithmus vergleichen können.

### Design-Entscheidungen

Der Prototyp verzichtet bewusst auf ein Tutorial. Die Story führt organisch ins Thema ein, die UI erklärt sich durch Nutzung. Das ist eine bewusste didaktische Entscheidung: Learning by Doing statt frontale Vermittlung.

Die Gegenüberstellung von manueller und automatischer Planung ist der zentrale Lernmoment. Man plant zuerst selbst, sieht das Ergebnis, lässt dann den Algorithmus ran – und merkt, wo man suboptimal geplant hat. Diese direkte Vergleichbarkeit macht algorithmische Optimierung greifbar.

Die ESG-Bewertung erweitert die Perspektive über reine Kostenoptimierung hinaus. Eine Route kann billig, aber klimaschädlich sein. Oder teuer, aber mit perfekter Pünktlichkeit. Die drei Dimensionen zeigen, dass "optimal" von den gewählten Kriterien abhängt.

## Limitationen

Der Prototyp fokussiert sich bewusst auf einen Ausschnitt des Gesamtkonzepts:

- Nur ein Fahrzeug (keine Multi-Vehicle Routing)
- Statische Zeitfenster (keine dynamischen Anforderungen während der Fahrt)
- Feste Karte (neue Generierung nur via `npm run build:tour`)
- Keine Kapazitätsbeschränkungen
- Vereinfachtes Verkehrsmodell (deterministisch mit leichter Variation)

Diese Einschränkungen sind didaktisch gewollt. Der Prototyp soll algorithmische Optimierung und ESG-Trade-offs vermitteln, nicht alle Facetten realer Tourenplanung abbilden. Die anderen Lernstufen des Gesamtkonzepts würden schrittweise Komplexität hinzufügen.

## Lizenz

Dieser Code wurde im Rahmen meiner Masterarbeit an der TH Augsburg entwickelt und steht für akademische und Bildungszwecke zur Verfügung. Eine kommerzielle Nutzung ist nicht gestattet. Bei Fragen zur Nutzung oder Integration in eigene Projekte gerne melden.

---

Entwickelt von Sven Zeller  
Business Information Systems (M.Sc.), TH Augsburg  
2025

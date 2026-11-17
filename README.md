# Swarajya — स्वराज्य

An original real-time strategy game set in the era of Chhatrapati Shivaji Maharaj (1646–1674).
Gather, build, advance through four ages and take the forts of the Sahyadri.

## Run

Open `index.html` in a browser, or serve the folder:

    python3 -m http.server 5173

## Layout

- `js/data.js` — factions, ages, units, buildings, technologies, scenarios
- `js/map.js` — map generation, A* pathfinding
- `js/sim.js` — simulation: economy, combat, production, fog, victory
- `js/ai.js` — enemy AI (plays by the same rules as the player)
- `js/render.js` — isometric canvas renderer (all art is drawn in code)
- `js/ui.js` — HUD, selection, mouse and keyboard
- `js/main.js` — menu, briefings, game loop

# Swarajya (स्वराज्य)

An original real-time strategy game set in the era of Chhatrapati Shivaji Maharaj, 1646 to 1674.
Gather, build, advance through four ages and take the forts of the Sahyadri.

## Run

Open `index.html` in a browser, or serve the folder:

    python3 -m http.server 5173

## Layout

- `js/data.js`: factions, ages, units, buildings, technologies, scenarios
- `js/map.js`: map generation, A* pathfinding
- `js/sim.js`: simulation: economy, combat, production, fog, victory
- `js/ai.js`: enemy AI (plays by the same rules as the player)
- `js/render.js`: isometric canvas renderer (all art is drawn in code)
- `js/ui.js`: HUD, selection, mouse and keyboard
- `js/main.js`: menu, briefings, game loop

## Art

The world is drawn in code as pixel art. Painted art replaces it when present:

1. Generate images from the prompts in `ART_PROMPTS.md`.
2. Save them under `assets/portraits`, `assets/buildings`, `assets/nature`, `assets/terrain` or `assets/ui` with the file names given there.
3. Run `python3 tools/build_assets.py` (needs Pillow). It removes the magenta background, sizes each image and writes `assets/manifest.js`.

Credits: portrait of Shivaji Maharaj, painting c. 1680 to 1687, British Museum, public domain, via Wikimedia Commons.

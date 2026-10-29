# Notes for Claude

This repo is the live site (GitHub Pages, branch main, root folder). The owner is not technical: do the work, keep explanations plain.

- Live files are in the repo root: `index.html` (generated), `mgba.js`, `mgba.wasm`, `manifest.webmanifest`, `icons/`.
- Source is in `source/`: `src/emu.js`, `src/emu.css`, `src/emu.html`, `src/voice.js`, plus `tracker_body.html` (the Pokédex tracker).
- To rebuild: `cd source && python3 build_standalone.py <build number>`; it writes `index.html` in the root. Bump the build number each update (it shows in the in-app Menu so the owner can tell they have the new version).
- The same source also built a Claude artifact version; code checks `window.claude` and falls back to standalone behaviour when it is absent.
- Never add ROMs or saves to the repo. The ROM is chosen on the phone and stored in the browser's IndexedDB.
- Owner's rules: portrait only, touch only, no save states, no haptics, main buttons only. Voice control is opt-in via the mic button.
- Tested with Playwright and hand-made test ROMs only; never with a real Emerald ROM or a real iPhone, so be honest about what is unverified.

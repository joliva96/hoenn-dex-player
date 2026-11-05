# Notes for Claude

This repo is the live site (GitHub Pages, branch main, root folder). The owner is not technical: do the work, keep explanations plain.

- Live files are in the repo root: `index.html` (generated), `mgba.js`, `mgba.wasm`, `manifest.webmanifest`, `icons/`.
- Source is in `source/`: `src/emu.js`, `src/emu.css`, `src/emu.html`, `src/voice.js`, plus `tracker_body.html` (the Pokédex tracker).
- To rebuild: `cd source && python3 build_standalone.py <build number>`; it writes `index.html` in the root. Bump the build number each update (it shows in the in-app Menu so the owner can tell they have the new version).
- The same source also built a Claude artifact version; code checks `window.claude` and falls back to standalone behaviour when it is absent.
- Never add ROMs or saves to the repo. The ROM is chosen on the phone and stored in the browser's IndexedDB.
- Owner's rules: portrait only, touch only, no save states, no haptics, main buttons only. Voice control is opt-in via the mic button.
- Tested with Playwright and hand-made test ROMs only; never with a real Emerald ROM or a real iPhone, so be honest about what is unverified.
- `mgba.js` in the repo root is the stock mGBA-wasm glue with ONE patch: the audio buffer can be a multiple of the engine's size (`window.__abufMul`, set from the Menu's "Audio smoothing" row). If the engine file is ever replaced, re-apply it: in the `createScriptProcessor($1, 0, $0)` snippet, size the node `$1 * mul` and call the engine callback `mul` times with sub-array views of the output buffer.
- The engine's own setVolume does not change loudness (only mutes), so there is no volume setting.

- Map tab (`source/src/hmap.js`): draws the whole Hoenn overworld ON THE PHONE from the user's own ROM (standard Emerald map tables at 0x486578; only the 49 placements are stored in the source). The picture is never stored in the repo (game artwork). Player position is read from the engine snapshot every 2 s only while the Map is on screen: IWRAM 0x5D8C holds a pointer to SaveBlock1 (it moves, so re-read each time); x/y are int16 at +0/+2 (plain map tiles), mapGroup/mapNum at +4/+5. Verified on the user's ROM (Emerald_National_Dex) in the sandbox. An earlier live "stitching" map made the game stutter and was removed: never read the WebGL canvas.

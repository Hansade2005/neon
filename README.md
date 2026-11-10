# Neon Overdrive

An original open-world crime, racing and role-play game for Windows (Electron + Three.js), for 1 to 4 local players, no networking.
Everything (cars, characters, brands, places, story) is original.

## What is in it
- A procedural 8x8-block city with traffic that obeys the lights, pedestrians, police and a wanted-stars system
- 14 vehicles: cars, motorbikes, a bicycle, taxi, box truck, bus, plane, helicopter, speedboat; jobs (taxi, bus, deliveries)
- Enterable interiors: bank with a vault heist, supermarket, bistro, hotel, gas station
- Airport, sea with marina and lighthouse, swimming
- Neon Arena: live football (the Pitch Clash engine), tickets, betting, mixed split-screen (football + race + free-roam at once)
- "Superstar Life" story: five acts with a rhythm-game concert, chases, a kidnapping and two endings
- Weak-GPU mode: detects Intel/integrated graphics and switches to cheap shading, fixed resolution and fewer objects (F10 toggles a stronger performance mode, F9 shows the error/slow-frame log)

## Run / build
```bash
npm install
npm start                     # bundles src/main.js and launches Electron
./tools/installer/build_installer.sh   # Windows installer (electron-builder + makensis)
```
Test in a browser: `npm run build:js`, serve the folder (`python3 -m http.server`) and open `src/index.html?autostart`.

## Layout
- `src/` game code (ES modules, bundled with esbuild)
- `assets/` models (GLB), voices, music, audio, UI thumbnails
- `tools/` Blender generators for cars/bikes/people/aircraft, retargeting, model slimming, voice and music fetchers, installer scripts
- `DESIGN.md`, `STAR_LIFE.md`, `MULTIPLAYER_PLAN.md`, `ASSETS_LICENSES.md` design notes and asset licences

## Assets and licences
See `ASSETS_LICENSES.md` and `assets/polyhaven/CREDITS.json`. Music is Creative Commons (CC0 / CC-BY, credited in-game).
The raw Mixamo animation files, the ambientCG/Poly Haven source packs and the audio uploads are not in the repository.
Audio uploaded by the author has not had its licence verified yet: keep this repository private until it has.

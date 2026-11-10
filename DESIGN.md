# Neon Overdrive: design & roadmap (living document)

Original GTA-Vice-City / San-Andreas / Need-for-Speed style open-world game for Windows (Electron + Three.js), 1-4 local players.
All brands, cars, characters and places are original.

## Pipeline
- Models are hand-modelled procedurally in Blender (tools/models/*.py -> assets/models/*.glb). Cars: lofted subdivision bodies (car_gen.py).
- Characters: MakeHuman/MPFB2 bodies via tools/players (casual clothing zones, men + women), animations retargeted from CMU mocap.
- Game: src/ (Three.js, bundled by esbuild). Installer built with makensis on Linux (tools/installer).

## Systems (checklist)
- [x] 8 cars + police car modelled (Blender)  - [ ] polish bodies/interiors
- [ ] Driving physics, traffic AI, police chases, street races, garage/customisation
- [ ] Big town: downtown, suburbs, harbour, beach, airport, stadium; sea with boats
- [ ] Real modelled buildings with interiors: houses, shops, restaurants, hotels, supermarket, bank, gas station, nightclub, hospital, police HQ
- [ ] Doors: cars (enter/exit, driver + passenger doors open/close) and buildings (walk up, press interact, door swings open, enter, close behind)
- [ ] Characters: walk/run/idle/talk/sit/drive animations; men and women; NPC pedestrians; dialogue system (talk, choices, shops, quest givers)
- [ ] Combat: fists/kicks/combos, melee (bat, knife), guns (pistol, SMG, shotgun, rifle), aiming, cover, health/armour, hits, ragdoll, wanted level
- [ ] Economy: cash on hand, bank accounts (deposit/withdraw/transfer at ATMs & bank branches), digital wallet with Neon Coins, shops, salaries, loans/interest, robbery loot, fines when busted, wallet UI on phone
- [ ] Air/sea: planes, helicopters, airport + flights between cities, boats
- [ ] Football stadium with a live AI match (reuse Pitch Clash engine), spectators
- [ ] Missions/story: nightclub, hotel, bank robbery, getaway, travel by flight, cut-scenes
- [ ] Split-screen 1-4 players, controllers, settings, save/load, audio (engine, radio stations, ambience)
- Poly Haven assets (CC0) downloaded to assets/polyhaven; credit 'Assets from Poly Haven' in game credits. Models are high-poly: decimate/texture-shrink when importing.

---
# Production plan (Unity-style): architecture, milestones, backlog

## Architecture (ECS-lite, all in src/)
- **World** (world.js): owns scene, city, vehicles[], peds[], players[]; fixed-step physics (120 Hz) + per-frame AI.
- **Entities**: Vehicle (vehicle.js: model + Car physics + doors + hp), Person/Ped (people.js, npc.js), Player (player.js: state machine foot -> enter -> car -> exit, camera, viewport).
- **Systems** (gameplay.js): Police/heat, Combat, Economy (kiosks, bank, wallet), Minimap; next: Missions, Races, Jobs (taxi), Aviation.
- **Data-driven**: cars table (car.js), cast (cast.py/people.js), voice lines (tools/voice/lines.json), settings (ui.js).
- **Pipeline**: Blender scripts -> GLB (tools/models, tools/people); Mixamo clips baked once to anims.glb and shared by all characters.

## Milestones
- [x] M0 Foundation: city, 8 cars + police, cast of 12, 22 animations, doors, on-foot + driving, 1-4 player split-screen, traffic + pedestrians, menus, audio (synth + recorded), voices, minimap
- [x] M1 Crime loop: heat/police chase, punching + pistol, cash/bank/ATM/Neon Coin wallet, shops (pistol/ammo/health/armor)
- [x] M2 Carjacking (cars, trucks via model, motorbikes), car damage + explosions + fire, health/wasted
- [x] M2b Bikes (motorbike + bicycle with riders, leaning), hospital + doctors, police station + officers, Jamendo CC-BY radio, club
- [x] M3 Street races (checkpoints, rivals, prizes)
- [ ] M4 More vehicles: taxi (with taxi-driver job + fares), pickup truck, box truck/semi, bus, motorbike, police SUV; vehicle-specific horns
- [ ] M5 Interiors (door-entry): bank (heist: guards, vault, getaway), supermarket, restaurant, hotel (lobby + rooms), nightclub, gas station (pumps, refuel, robbery), police HQ, hospital
- [ ] M6 Aviation + sea: airport (terminal, runway, hangar), plane (Blender model + flight model), helicopter, flights between cities; harbour, boats, beach, sea shader
- [ ] M7 Football stadium district with a live AI match (reuse Pitch Clash engine) and spectators
- [ ] M8 Story: scripted missions + cut-scenes (nightclub, hotel, bank job, getaway, flight)
- [ ] M9 Polish: weather, day/night cycle, save/load, controller rebinding, optimisation pass (LOD, instancing), installer + auto-update

- [~] M10 SUPERSTAR LIFE story campaign (Act 1 playable in v0.5: mansion, family, dialogue, garage, paparazzi chase, studio): see STAR_LIFE.md (mansion, family, concerts, kidnapping, escape)
- [x] M11 Neon Arena (v0.4: tickets, seats, live match, betting, mixed split-screen football): football stadium with tickets and a live AI match (see STAR_LIFE.md, STADIUM section)

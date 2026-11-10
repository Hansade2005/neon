# SUPERSTAR LIFE: director's & producer's plan

A story campaign inside Neon Overdrive. You play a global music superstar with a mansion, a family and a sold-out US tour.
Everything is cheerful and glamorous until a rival obsessed with your fame decides to kidnap you. Tone: glossy action-thriller (think heist-movie energy), never gory.
**Content guard-rails (design decisions):** the kidnap target is the adult star; children are never targets, never in combat and never harmed; the family is the emotional stake, not collateral.

## Logline
"The biggest night of her career is also the night someone decides to take her."

## Cast
| Role | Description |
|---|---|
| **NOVA VEGA** (player, any cast member can be re-skinned) | Superstar singer-songwriter. Wealthy, confident, protective of her family. |
| **Marcus** (partner) | Producer/husband, calm, funny. Appears in mansion scenes. |
| **Zoe (9) and Leo (6)** | Children (non-combat NPCs). Created in a later character pass; until then represented off-screen/seen from distance. |
| **Dante "Ghost" Kane** (antagonist) | Obsessed fan turned mastermind. Calm voice, expensive suits, always one step ahead. |
| **Rex Holloway** (bodyguard) | Ex-military head of security, player's ally, drives the getaway car. |
| **Agent Lena Ortiz** | Police/federal contact who joins the final chase. |
| Crew | Manager, stylist, tour driver, pilot, concert fans, paparazzi. |

## Structure: 5 acts (about 90 minutes)

### Act 1: "Life at the Top" (tutorial + establishing)
1. **Mansion morning.** Wake up in the Hollywood Hills mansion. Free-roam the grounds: pool, studio, garage with 8 supercars, helipad. Talk to family (dialogue system). Pick a car.
2. **Fans & paparazzi.** Drive to the studio; paparazzi bikes (motorbikes) tail you. Light chase: lose them or pose for photos for **fame points**.
3. **Studio session.** Rhythm-lite minigame (press keys to the beat) to "record" the hit single. Unlocks the tour.
**New systems:** fame meter, money income from music, dialogue, cut-scenes.

### Act 2: "The Tour" (Los Angeles)
1. **Soundcheck at the arena** (reuse the Neon Arena stadium venue) and meet the crew.
2. **Concert #1: Los Angeles.** Rhythm performance (3 songs) with lighting rig, crowd, fireworks. Score = encore size = money + fame.
3. **After-party at the Neon Club** (already built). Meet Dante for the first time, disguised as a charming VIP. He asks too many questions.
4. **Hotel night** (hotel interior). A note is slid under the door. Rex sweeps the room.

### Act 3: "On the Road" (USA tour, flight travel)
Cities: **Los Angeles -> Las Vegas -> Chicago -> New York -> Miami** (stylised fictional versions with real city names allowed because they are places, but all brands/venues fictional).
Per city: arrival (airport or tour bus), one **concert**, one **side event** (charity, TV interview, street-race with fans, hotel penthouse party).
**Aviation system** (M6) used for flights; each flight has a short on-board scene.
Rising tension: stalker evidence, a hacked light rig, a sabotaged car (explosion set piece with the existing wreck system).

### Act 4: "The Kidnapping" (New York finale concert)
1. **Concert #5 at the stadium.** Dante's team hijacks the show: the lights die, fireworks go wrong, **everyone panics (the crowd bursts into chaos; fights break out)**.
2. **Abduction.** Gunmen in stage-crew uniforms grab the star in the blackout. Playable sequence as the star: fight, escape the stage, get cornered, taken.
3. **Switch to Rex (second playable character).** Follow the van through the city: carjack a taxi, motorcycle chase through traffic, police join (existing heat system).
4. **Hostage hideout** (warehouse + harbour). Gun fights, stealth, rescue drones.

### Act 5: "Escape" (the star escapes)
1. **The star breaks out herself:** a stealth/escape level (no weapons at first): pick the lock, steal a phone, call Marcus.
2. **Harbour chase:** speedboat / helicopter pursuit (M6 vehicles).
3. **Final showdown on the pier** with Dante; choice: hand him to the police or let the fans decide (two endings).
4. **Epilogue:** triumphant homecoming concert; family hug at the mansion; credits.

## Locations (new content needed)
| Location | Status | Notes |
|---|---|---|
| Hollywood Hills mansion + grounds, pool, studio, helipad | to build | large Blender kit: villa, pool, garden props (Poly Haven), interior rooms |
| Family house (second property, beach) | to build | reuse mansion kit |
| Concert arena + stage rig | stadium kit (see STADIUM below) | stage, lights, pyro, crowd |
| Hotel (lobby, penthouse, corridor) | M5 interiors | |
| Airport + planes + helicopters | M6 | |
| Warehouse, harbour, pier | M6 | |
| Neon Club, hospital, police station | **built** | reuse for scenes |

## Systems needed (technical breakdown)
1. **Mission/story engine** (3 days of dev): data-driven missions (JSON): objectives (go to, kill, escort, drive, survive, talk), triggers, fail conditions, checkpoints, mission rewards. Save/restore progress.
2. **Cut-scene system** (3 days): scripted camera paths + character animations + subtitles + voice (Kokoro) + letterbox; skippable. Director tools: timeline files `scenes/*.json`.
3. **Dialogue system** (2 days): dialogue trees with choices, portraits, voice lines; used by NPC talking, shops, family.
4. **Concert minigame** (4 days): rhythm gameplay + staging (lighting rig, pyro, fans); songs generated by the music engine (3 original songs).
5. **Fame + wealth progression** (2 days): fame meter, income, mansion upgrades, car collection (garage).
6. **Second playable character** (2 days): switch protagonists mid-mission (Rex).
7. **Crowd panic + stampede AI** (3 days): mass NPC flee behaviour, fights, security response.
8. **Kidnap sequence tech** (2 days): scripted ambush, blackout, grab, drag-to-van animation using existing hit/idle clips plus new Mixamo "grab/struggle".
9. **Aviation + boats** (M6): needed for Acts 3 and 5.
10. **Family/kids models** (3 days): child characters (MPFB supports age targets) with idle/play/wave animations; safe-content rules enforced in code (children cannot be hit or targeted).

## Animations still to source (Mixamo)
Dancing (hip hop, samba), singing/performing, microphone idle, waving/clapping/cheering, hand-held phone, struggling/being grabbed, climbing/ladder, lock-picking/crouch, hugging, sitting (couch/chair), swimming, driving boat/helicopter pilot poses.

## Audio plan
- Original concert songs (3 for the minigame) from the generative music engine; Jamendo CC-BY tracks for radio.
- Voice: Kokoro lines for each character (script below); crowd reaction samples (party/celebration upload).
- Sound design: stage pyro, fireworks, helicopter, boat, glass break, struggle.

## Production schedule (one developer, with Claude as the build engineer)
| Milestone | Content | Estimate |
|---|---|---|
| S0 (now) | Foundation + crime sandbox + club/hospital/police/bikes/radio | **done (v0.3)** |
| S1 | Mission + dialogue + cut-scene engine; mansion + family (adults only first) | ~2 weeks |
| S2 | Concert minigame + Los Angeles arena + after-party | ~2 weeks |
| S3 | Aviation + hotel interiors + 4 more tour cities (reusing the city generator with themes) | ~4 weeks |
| S4 | Kidnapping act (crowd panic, ambush, Rex chase, hideout) | ~3 weeks |
| S5 | Escape act (stealth, harbour, boat/heli chase, finale, 2 endings) | ~3 weeks |
| S6 | Polish: voice acting pass, balancing, save/load, optimisation, QA | ~3 weeks |

## Open design decisions (my recommendations in bold)
1. Player character: **fixed protagonist (Nova Vega) with an outfit/hair selector**, so story, voice and cut-scenes are consistent.
2. Tone: **PG-13**: no gore, no harm to children, stylised comic-action violence.
3. Endings: **two** (justice vs. fans decide).
4. Tour cities: **real US city names, fictional venues and brands**.
5. Difficulty: **forgiving checkpoints** so story missions never feel punishing.

## Sample script excerpt (Act 4, blackout)
```
[STADIUM, NIGHT. Crowd of 60,000. NOVA hits the final chorus. Fireworks cue.]
ANNOUNCER (V.O.): "...your Queen of the Neon Skyline, Nova Vega!"
[All lights cut. Silence. A single phone-light, then thousands.]
REX (comms): "Nova, stay on stage. Something's wrong with the rig."
[Pyro fires into the wrong rack. Crowd screams. Stampede toward the exits. Fights.]
GHOST (over the PA, calm): "Good evening, Nova. You never answered my letters."
[Three crew-uniformed gunmen close in. Player controls Nova: shove, dodge, grab a mic stand.]
GHOST: "Don't hurt her. She's the whole show."
[Hood. Blackout. CUT TO: Rex vaulting the barrier, sprinting after the van.]
```

---

# STADIUM: "Neon Arena" (football night)

## What the player sees
A floodlit 40,000-seat stadium on the east side of the city. Ticket office out front, turnstiles, concourse with food stalls, a fan zone with banners, and the bowl: stands full of spectators, a real pitch, scoreboard, and a **live AI-vs-AI football match** running the Pitch Clash engine.

## Player flow
1. Walk or drive up. Match-day banner shows **fixtures** (generated from the Pitch Clash competition engine: Neon Premier League round).
2. **Ticket office kiosk** (F): choose seat tier: Standing $30 / Stand $80 / Lower tier $150 / VIP box $400 (food and drinks included, best camera). Pay with cash or Neon Coins; ticket stored in the wallet (phone).
3. Turnstile scan (door animation + beep), walk the concourse (food stalls: pie, drink, scarf).
4. **Find your seat** (seat markers); sit (sit animation). Camera switches to a fan-view with look-around; press a key to cycle TV-style broadcast cameras (Pitch Clash director).
5. Live match with **commentary** (existing Kokoro commentary), crowd chants, goal celebrations, flares, Mexican wave.
6. **Side mini-events:** bet on the match with Neon Coins (re-use sportsbook odds from Pitch Clash), pick-pocket risk in the crowd, a scuffle in the stands (security + police response).
7. Half-time: concourse, kiosk, fireworks; full time: crowd exits (traffic jam outside!).

## Technical approach
- **Match engine:** reuse `src/engine/sim.js` and `src/tournament.js` from Pitch Clash headlessly (fixed-step), AI vs AI. Renderer: 22 players from the football GLBs (16 variants + keeper) with Idle/Jog/Run/Sprint/Shoot/Tackle clips, instanced by distance (LOD).
- **Venue geometry:** parametric bowl: tiered stands (instanced seat rows), roof ring, 8 floodlight towers (point-light fakes + glow sprites), scoreboard with canvas texture updated live, ad boards, pitch from Pitch Clash textures.
- **Spectators:** instanced humanoid crowd (as in Pitch Clash) with colour-coded kits; wave and cheer driven by match events.
- **Audio:** stadium ambience + chants + goal horn + commentary (assets already exist in the Pitch Clash project; copy with licence notes).
- **Tickets:** economy hook via the wallet; ticket entity with seat id; match schedule saved.
- **Budget:** ~1 week for the venue + live match, 3 days for ticketing/concourse/seating flow, 2 days for betting + events.

## Dependencies
Wallet and kiosks (done), spectator crowd tech (reuse), dialogue (S1) for ticket clerk lines, sit/cheer animations from Mixamo (sitting idle, clapping, cheering).


## Status (v0.7.0)
Acts 1-5 implemented in src/story.js + src/story2.js: concert rhythm minigame (4 original synth songs), stage, club/hotel scenes, Vegas evidence hunt, Chicago car chase, NY blackout + gunmen fight, Rex van chase, hideout escape, harbour showdown, two endings, epilogue.
Known simplifications: all concerts reuse the Neon Arena stage with a per-city LED backdrop; flights are fade cards; thugs have no wall pathing.

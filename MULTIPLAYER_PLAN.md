# Multiplayer "Hub & Modes" plan (local 1-4 players, split-screen)

**Goal:** friends in the same room can be in *different activities at once*: some play football in the live Neon Arena match, some race or roam the city, and anyone can walk (or drive) to the stadium and watch their friends play.

## Core idea: ONE shared world, a MODE per player
| Mode | What the player does | Camera / HUD |
|---|---|---|
| ROAM | on foot, in a car or bike; crime, shops, club, hospital | third-person; minimap, wanted stars, cash |
| RACE | street-race session (own checkpoints) | chase cam; lap/position |
| FOOTBALL | controls one footballer in the live match (Pitch Clash engine) | TV camera + scoreboard; yellow ring marks your player |
| SPECTATE | sits in a bought seat in the stands | seat/TV/end/high cameras + scoreboard + commentary |

All modes live in the same `World` (one scene, one clock). The Arena's match is global: every player sees the same match.

## How players move between modes
- **At the lobby:** each slot picks Open World or Football (race lobby = all race).
- **In the world:** Ticket office kiosk -> "PLAY football for <team>" (only before kick-off), or buy a ticket and use the gate to take a seat and watch.
- **Leaving:** football players return to the plaza at full time; spectators press F to stand up.
- **Friends visiting:** a ROAM player drives or walks to the stadium (green dot on the minimap), buys a ticket, and watches a friend play live.

## Controls (per device, no conflicts)
- P1 keyboard (WASD) and P2 keyboard (arrows) or pads; the same device keeps its mapping in every mode.
- Football: stick move, pass/shoot/through/lob/skill/switch/sprint (J K L I E Q Shift | Z X C B G N R-Shift | pad A B Y X RT LB RB).

## Technical design (implemented)
- `Player.state` machine: foot, enter, car, exit, **watch**, **football**.
- `Arena` owns the match, crowd, stands, cameras, tickets, bets, join/leave logic; `Match.humans` = the players who joined; `readFootball(device)` converts input to the engine's fields.
- Split-screen: each player has its own viewport and camera; HUD is per viewport; the football camera is the high west-side TV camera so the stick axes stay consistent.
- One match at a time; fixtures rotate every ~7 minutes (pre-match 50 s, two halves, half-time, full-time).

## Next steps
1. Race lobby that lets football players keep playing while others race (separate race session overlay).
2. Choose formations and captains before kick-off (reuse Pitch Clash team management).
3. Replays on goals for spectators; goal-line cameras.
4. Mixed-mode rules: spectators can bet on the match played by friends; goals pay Neon Coins to the scorer.
5. Optional later: online play (WebRTC) using the same mode architecture.


## Status (v1.0.0)
Race lobby implemented: each lobby slot cycles OPEN WORLD / FOOTBALL / STREET RACE. Racers run a non-modal race (Race.mixed) so football players and roamers keep playing; results appear on the racers' HUD. Free-roam players can also join a race at the 'Join a street race' kiosk on the plaza.

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/vicko223/spotdiff/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/vicko223/spotdiff/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

# Double Take — Spot the Difference

A spot-the-difference game for the make.fun bounty
[Make the best spot the difference game](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451).

Two pictures sit side by side. The right one carries a handful of sneaky changes —
a missing cloud, a recoloured sail, an owl that closed one eye. Click a difference
on either picture to ring it on both. Wrong clicks cost five seconds and points;
three hints per level point you at a change you missed. Find them all before the
clock runs out.

Three original scenes, drawn entirely in code as SVG from data (the two panels are
rendered from the same element list, so they differ only where a difference says so):

- **Harbor Morning** (easy, 8 differences) — lighthouse, boats and gulls at dawn.
- **Market Square** (medium, 10 differences) — stalls, lanterns and a cat.
- **Night Garden** (hard, 12 differences) — moonlight, fireflies and small secrets.

Score rewards speed: 100 points per find, a time bonus for finishing early, star
ratings per level, synthesized WebAudio sounds (no audio files), keyboard controls
(H hint, P pause, M mute, 1–3 level select) and mouse play.

## Run it

Open `game/index.html` in a desktop browser — it plays fully offline, no build
step, no network requests. Or serve it:

```sh
node serve.ts   # then open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `game/` and `screenshots/` to `out/` and writes `out/dossier.json`.

## Layout

- `game/index.html` — page shell and styles
- `game/src/scenes.js` — the three scenes and their differences, as data
- `game/src/paint.js` — SVG painters for every scene element, plus markers
- `game/src/game.js` — game state, timer, input, HUD
- `game/src/audio.js` — synthesized sounds
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=cover|title|garden|complete`)
- `game/src/main.js` — entry point

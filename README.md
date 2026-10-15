# Pirate Battle

A local single-player naval game built with React, TypeScript and PixiJS. Ranking and personal match history use Axios, TanStack Query and MSW in development and production.

## Run

Use Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm dev
```

No environment variables or private services are required. Open the HTTP address shown by Vite; service workers require localhost or HTTPS.

## Controls

- W / Arrow Up: move forward with acceleration.
- A / Arrow Left, D / Arrow Right: rotate.
- Space: front cannon. Q / E: left / right broadsides.
- Escape or the HUD pause button: pause.
- Touch controls support simultaneous movement and attacks. Landscape is recommended on mobile.
- Losing focus or hiding the tab pauses automatically. Resume requires an explicit action.

## Options and rules

Match duration: 60, 120 or 180 active seconds. Enemy spawn interval: integer seconds from 1 to 10. Options persist locally; each battle copies the settings when it starts. Changing Options while paused affects the next battle.

Every enemy destroyed by the player awards exactly one point. Chaser contact explosions award zero points. Spawns choose Chaser or Shooter randomly with equal probability. Among Shooters, the weights are 75% standard, 20% healer, 5% speed reward. Random selection does not guarantee both enemy types in every individual battle.

Healer ships leave wood that restores 25 HP when collected, capped at maximum HP. Wood lasts 20 active seconds. Rare yellow ships grant 50% faster newly fired projectiles for five active seconds. Damage, range and cooldown remain unchanged. Another reward refreshes the duration without stacking the multiplier. Pausing freezes the bonus.

## Ranking, history and persistence

Captain Jack is the local player. Other captains are deterministic fixtures. History contains only completed matches belonging to the local player. Ranking compares duration, spawn interval and the gameplay rules version. Ties use completion date ascending, then match ID ascending. Results are paginated five per page.

The result and pending registration are stored before submitting through a TanStack Query mutation. Requests use the match ID as the idempotency key. MSW stores confirmed records and returns an existing record on retry. Pending records survive refresh and can be retried from the result or Captain’s Log. Starting another battle remains available while a previous record is pending. An abandoned battle is not registered. The last completed result remains stored after refresh, but the menu opens without automatically displaying the result dialog.

## Network demo

Open Ranking or Match History, expand **Network demo**, and select a scenario. The selection persists. Select **success** to recover and press **RETRY** for pending registrations. Reset requires confirmation and clears mock records, pending submissions and the last result.

Scenarios: success, empty, slow (2.5 seconds), variable (alternating 1.8 seconds / 100 ms), timeout, offline, HTTP 400, HTTP 500, ranking-only failure, history-only failure, timeout after commit, and registration-only outage. Axios times out after four seconds. Timeout-after-commit writes once before delaying its response; the retry returns the existing record.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:report
pnpm build
pnpm preview
```

The included tests cover rules and desktop/mobile flows for Options, pause, network recovery, pagination, result restoration and registration idempotency. They are a focused suite, not complete coverage of every challenge acceptance criterion. HTML reports are generated in playwright-report; failure traces are retained.

## Deployment

Use the Vite preset, `pnpm build`, and output directory `dist` on a static HTTPS host. Commit `public/mockServiceWorker.js`; mocks start in production too. This archive does not include a deployment URL.

## Remaining delivery work

The full challenge still needs gameplay E2E coverage through real combat inputs, versioned visual regression baselines, three-minute performance profiling and five-cycle memory measurements. Desktop/mobile browser emulation does not replace verification on a physical phone. Audio playback still needs a listening check on the target devices. Enemies use cached A* routes to navigate around islands, with swept collision checks on every movement segment.

Assets are supplied by the challenge. No external fonts were added; the interface uses system monospace fonts.

# Architecture

## Responsibilities

`src/game` contains plain TypeScript movement, health, combat, spawning, collision, match and reward rules. Pixi factories create ship views, health bars, island geometry and wakes. `GameCanvas` owns the Pixi application, simulation objects and the rendering loop. React owns screens, dialogs, Options and the HUD.

The game advances using ticker delta seconds. Continuous position and projectile state remain outside React. React receives health and score changes, whole remaining seconds and whole bonus seconds. No entity list is mirrored into React state every frame.

## Coordinates and collisions

The simulation uses a fixed 2400 x 1350 arena. A camera scales the world uniformly based on viewport height, with a minimum readable scale, and follows the player. Camera offsets clamp at the fixed arena boundaries. The viewport shows a portion of the map instead of fitting the entire arena into a narrow screen. Arena dimensions, positions, collision radii, speeds and combat ranges remain unchanged. The Pixi renderer resizes to its container. On touch devices, portrait fallback rotates a logical landscape container; pointer coordinates are converted back into logical game axes. Water fills any remaining space outside the playable world.

Rounded island outlines are shared by rendering and collision. Swept segment checks prevent fast projectiles crossing targets or islands between frames. Each projectile is removed after its first impact. Ship/island collision uses a shared conservative circular hull radius with explicit shore clearance; blocked movement is restored rather than resolved with a physics engine. Player and enemy shore clearances use the same configuration. If the player’s center cannot be occupied by the enemy, pathfinding projects the goal to the first safe point along an approach segment instead of returning an empty route for every enemy. Shooter line of sight uses the projectile radius, allowing shots near shore without treating the entire ship as a projectile. Shooter rotation uses the shortest angle and a limited turn speed. When terrain blocks a direct course, both enemy types use A* over a shared navigation grid, cached per collider set and collision radius. Grid edges and smoothed route segments use swept-circle clearance checks; routes are refreshed periodically as the player moves. Shooters fire only with clear line of sight.

## Input, pause and lifetime

Keyboard and touch inputs are independent boolean sources merged before each simulation update. Pointer capture keeps the steering finger active while it slides, combining forward movement and turning. Independent fire pointers allow movement, turning and attacks simultaneously. Releases and cancellation clear the corresponding inputs. Pause unbinds and resets keyboard state, clears touch state, stops the ticker and ambient loops. Resume rebinds keyboard input and discards the first ticker delta. No pause time advances the match, cooldowns, effects, pickups or rewards.

Each React effect owns one Pixi application. Asynchronous initialization checks cancellation before attaching resources. Cleanup removes scene and focus listeners, keyboard listeners, ticker callbacks and active audio sources, and destroys display objects. Decoded textures and audio buffers are reused; individual game audio instances own their active sources. A shared AudioContext is unlocked from user interaction.

Restart changes the canvas key and creates a new match with a fresh settings snapshot. Finished matches stop simulation and render one final frame. Dialog focus starts on the heading rather than the Play Again button; keyboard focus remains visible on interactive controls.

## Enemy rewards

Chaser and Shooter are discriminated state types. Shooter variants reuse movement and firing rules while selecting their own texture family and death reward. Combat emits events; the scene handles audio, effects and score. Rewards only follow player kills. Healing uses collectible state with a finite lifetime; projectile speed uses a finite active-time timer. The multiplier applies at firing time, so existing projectiles retain their velocity.

## Data boundary

`data/contracts.ts` defines records and pages. `data/api.ts` is the Axios boundary. TanStack Query owns query caching, abort signals, mutation retry and invalidation. Query keys include resource, settings/rules version, page and network scenario, preventing late responses from replacing another view’s data.

The client queue persists a completed record before submitting. The mock backend persists confirmed records independently and checks match ID idempotency before insertion. A timeout after committing therefore does not duplicate a record. New battles never wait on HTTP. A manual retry and online listener drain pending submissions.

The two exposed Options fields form the runtime settings snapshot. Fixed gameplay constants live in named configuration objects in the corresponding systems. The record’s rules version identifies those fixed rules; it must change when balance changes. A single complete typed gameplay configuration snapshot is a remaining architecture improvement required by the full challenge.

## Tradeoffs

No ECS, state-machine library or physics engine was added. Containers group sprites and fire effects, avoiding child sprites on Pixi leaf objects. Wakes have a hard entity cap and finite lifetime. Cross-tab transactional storage coordination, comprehensive profiling and the full challenge E2E/visual suite are outside this update. System fonts avoid another asset dependency. Local storage is suitable for a demonstrable mock backend, not a trusted leaderboard.

## Initial spawn and water wakes

Spawn state tracks the initial one-second phase separately from subsequent configured intervals and carries frame overshoot forward. A failed first safe-position search retries on the next frame. Wakes emit by actual distance traveled, not by input or an assumed speed. They render beneath land and ships, fade after stopping and are capped to bound resource use.

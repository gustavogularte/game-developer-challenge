import { createIslandCannons } from './game/islandCannons';
import { createIslandCannonLayer } from './game/createIslandCannonLayer';
import { createCrewLayer } from './game/createCrewLayer';
import { createPlayerFeedback } from './game/createPlayerFeedback';
import { getShipIslandRadius } from './game/collision';
import { getCameraTransform } from './game/camera';
import * as React from 'react';
import * as PIXI from 'pixi.js';
import type { PlayerInput } from './game/input';
import type { GameSettings } from './game/settings';
import {
  rewardConfig,
  collectHealthPickups,
  type HealthPickup,
} from './game/rewards';
import { createWakeLayer } from './game/createWakeLayer';
import woodImageUrl from '../assets/png/default/ship_parts/wood_1.png';
export interface GameControls {
  pause?: () => void;
  resume?: () => void;
  setInput?: (action: keyof PlayerInput, pressed: boolean) => void;
}
const shipUrls = import.meta.glob<string>(
  '../assets/png/default/ships/ship_*.png',
  { eager: true, query: '?url', import: 'default' },
);
function variantImages(base: number) {
  return {
    green: shipUrls[`../assets/png/default/ships/ship_${base}.png`],
    amber: shipUrls[`../assets/png/default/ships/ship_${base + 6}.png`],
    red: shipUrls[`../assets/png/default/ships/ship_${base + 12}.png`],
    dead: shipUrls[`../assets/png/default/ships/ship_${base + 18}.png`],
  };
}
const healerImages = variantImages(4);
const speedImages = variantImages(6);

import oceanImageUrl from '../assets/png/default/tiles/tile_73.png';
import cannonBallImageUrl from '../assets/png/default/ship_parts/cannon_ball.png';
import explosionImageUrl from '../assets/png/default/effects/explosion_1.png';
import playerGreenImageUrl from '../assets/png/default/ships/ship_2.png';
import playerAmberImageUrl from '../assets/png/default/ships/ship_8.png';
import playerRedImageUrl from '../assets/png/default/ships/ship_14.png';
import playerDeadImageUrl from '../assets/png/default/ships/ship_20.png';
import chaserGreenImageUrl from '../assets/png/default/ships/ship_3.png';
import chaserAmberImageUrl from '../assets/png/default/ships/ship_9.png';
import chaserRedImageUrl from '../assets/png/default/ships/ship_15.png';
import chaserDeadImageUrl from '../assets/png/default/ships/ship_21.png';
import shooterGreenImageUrl from '../assets/png/default/ships/ship_5.png';
import shooterAmberImageUrl from '../assets/png/default/ships/ship_11.png';
import shooterRedImageUrl from '../assets/png/default/ships/ship_17.png';
import shooterDeadImageUrl from '../assets/png/default/ships/ship_23.png';
import { arenaConfig } from './game/arena';
import { createGameAudio } from './game/audio';
import {
  createCombatState,
  projectileConfig,
  splashConfig,
  updateCombat,
  type CombatEvent,
  type ProjectileState,
  type SplashState,
} from './game/combat';
import { createHealthBar } from './game/createHealthBar';
import { createShipView } from './game/createShipView';
import { enemyConfig, type EnemyState } from './game/enemy';
import { getHealthStage } from './game/health';
import { createPlayerInput } from './game/input';
import { bindKeyboardInput } from './game/keyboard';
import {
  constrainPlayerToArena,
  updatePlayerMovement,
  type PlayerState,
} from './game/player';
import { createSpawnState, updateEnemySpawning } from './game/spawn';
import { createIslands } from './game/islands';
import { createIslandLayer } from './game/createIslandLayer';
import {
  createIslandColliders,
  isCirclePathBlocked,
} from './game/islandGeometry';
import {
  createMatchState,
  getRemainingSeconds,
  advanceMatch,
  type MatchResult,
} from './game/match';

interface GameCanvasProps {
  settings: GameSettings;
  controls: GameControls;
  onPauseChange: (paused: boolean) => void;
  onBoostChange: (seconds: number) => void;
  onScoreChange: (score: number) => void;
  onHealthChange: (health: number) => void;
  onTimeChange: (remainingSeconds: number) => void;
  onMatchEnd: (result: MatchResult) => void;
}

type ShipView = Awaited<ReturnType<typeof createShipView>>;
type HealthBarView = Awaited<ReturnType<typeof createHealthBar>>;
type GameAudio = Awaited<ReturnType<typeof createGameAudio>>;

interface EnemyView {
  ship: ShipView;
  healthBar: HealthBarView;
  boundsRadius: number;
}

interface DestructionEffect {
  container: PIXI.Container;
  explosion: PIXI.Sprite;
  label: PIXI.Text;
  elapsedSeconds: number;
}

const sceneConfig = {
  backgroundColor: '#167b9c',
  maxResolution: 2,
  millisecondsPerSecond: 1000,
  shipRotationOffset: Math.PI,
  healthBarGap: 8,
};

const playerStartConfig = { maxHealth: 100, rotation: 0, speed: 0 };

const playerImages = {
  green: playerGreenImageUrl,
  amber: playerAmberImageUrl,
  red: playerRedImageUrl,
  dead: playerDeadImageUrl,
};

const chaserImages = {
  green: chaserGreenImageUrl,
  amber: chaserAmberImageUrl,
  red: chaserRedImageUrl,
  dead: chaserDeadImageUrl,
};

const shooterImages = {
  green: shooterGreenImageUrl,
  amber: shooterAmberImageUrl,
  red: shooterRedImageUrl,
  dead: shooterDeadImageUrl,
};

const splashAppearance = {
  outerRadiusX: 8,
  outerRadiusY: 4,
  outerColor: 0xd9f8ff,
  outerStrokeWidth: 2,
  innerRadiusX: 4,
  innerRadiusY: 2,
  innerColor: 0xffffff,
  innerStrokeWidth: 1,
  scaleGrowth: 2,
};

const destructionAppearance = {
  durationSeconds: 0.8,
  initialScale: 0.6,
  scaleGrowth: 1,
  labelOffsetY: -40,
  labelRiseDistance: 35,
  fontFamily: 'monospace',
  fontSize: 28,
  textColor: '#ffe08a',
  textStrokeColor: '#38240b',
  textStrokeWidth: 4,
};

function getSpriteBoundsRadius(sprite: PIXI.Sprite): number {
  return Math.hypot(sprite.texture.width, sprite.texture.height) / 2;
}

export function GameCanvas({
  settings,
  controls,
  onPauseChange,
  onBoostChange,
  onScoreChange,
  onHealthChange,
  onTimeChange,
  onMatchEnd,
}: GameCanvasProps) {
  const [loadState, setLoadState] = React.useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLoadState('loading');
    const app = new PIXI.Application();
    const input = createPlayerInput();
    const keyboardInput = createPlayerInput();
    const touchInput = createPlayerInput();
    let cancelled = false;
    let initialized = false;
    let appDestroyed = false;
    let gameAudio: GameAudio | undefined;
    let unbindKeyboardInput: (() => void) | undefined;
    let unbindScene: (() => void) | undefined;

    function destroyApp(): void {
      if (!initialized || appDestroyed) return;
      appDestroyed = true;
      app.destroy(true, { children: true });
    }

    function cleanup(): void {
      cancelled = true;
      controls.pause = undefined;
      controls.resume = undefined;
      controls.setInput = undefined;
      unbindKeyboardInput?.();
      unbindScene?.();
      unbindKeyboardInput = undefined;
      unbindScene = undefined;
      gameAudio?.destroy();
      gameAudio = undefined;
      destroyApp();
    }

    async function start(): Promise<void> {
      await app.init({
        resizeTo: containerRef.current!,
        background: sceneConfig.backgroundColor,
        autoDensity: true,
        resolution: Math.min(
          window.devicePixelRatio || 1,
          sceneConfig.maxResolution,
        ),
        autoStart: false,
      });

      initialized = true;

      if (cancelled) {
        destroyApp();
        return;
      }

      const [oceanTexture, projectileTexture, explosionTexture] =
        await Promise.all([
          PIXI.Assets.load<PIXI.Texture>(oceanImageUrl),
          PIXI.Assets.load<PIXI.Texture>(cannonBallImageUrl),
          PIXI.Assets.load<PIXI.Texture>(explosionImageUrl),
        ]);

      if (cancelled) return;

      await PIXI.Assets.load([
        ...Object.values(chaserImages),
        ...Object.values(shooterImages),
        ...Object.values(healerImages),
        ...Object.values(speedImages),
        woodImageUrl,
      ]);

      if (cancelled) return;

      const ocean = new PIXI.TilingSprite({
        texture: oceanTexture,
        width: app.screen.width,
        height: app.screen.height,
      });
      const woodTexture = PIXI.Assets.get<PIXI.Texture>(woodImageUrl);
      const wake = createWakeLayer();
      const world = new PIXI.Container();
      const shipsLayer = new PIXI.Container();
      const projectilesLayer = new PIXI.Container();
      const effectsLayer = new PIXI.Container();
      const healthBarsLayer = new PIXI.Container();

      app.stage.addChild(ocean, world);
      world.addChild(
        wake.container,
        shipsLayer,
        projectilesLayer,
        effectsLayer,
        healthBarsLayer,
      );

      const islands = createIslands();
      const islandLayer = await createIslandLayer(islands);
      const islandColliders = createIslandColliders(islands);

      if (cancelled) {
        islandLayer.destroy({ children: true });
        return;
      }

      world.addChildAt(islandLayer, 1);
      const crew = await createCrewLayer();
      if (cancelled) {
        crew.container.destroy({ children: true });
        return;
      }
      world.addChildAt(crew.container, 2);

      const islandCannons = createIslandCannons(islands);
      const cannonLayer = await createIslandCannonLayer(islandCannons);
      if (cancelled) {
        cannonLayer.container.destroy({ children: true });
        return;
      }
      world.addChildAt(cannonLayer.container, 2);

      const playerView = await createShipView(playerImages);

      if (cancelled) {
        playerView.container.destroy({ children: true });
        return;
      }

      const playerFeedback = createPlayerFeedback(playerView.sprite);
      playerView.container.addChildAt(playerFeedback.container, 0);
      shipsLayer.addChild(playerView.container);
      const playerBoundsRadius = getSpriteBoundsRadius(playerView.sprite);
      const playerHealthBar = await createHealthBar();

      if (cancelled) {
        playerHealthBar.container.destroy({ children: true });
        return;
      }

      healthBarsLayer.addChild(playerHealthBar.container);

      const player: PlayerState = {
        x: arenaConfig.width / 2,
        y: arenaConfig.height / 2,
        rotation: playerStartConfig.rotation,
        speed: playerStartConfig.speed,
        health: playerStartConfig.maxHealth,
        maxHealth: playerStartConfig.maxHealth,
      };

      const combat = createCombatState();
      const match = createMatchState(settings.durationSeconds);
      let paused = false;
      let skipNextDelta = false;
      let lastBoostSeconds = 0;
      const pickups: HealthPickup[] = [];
      const pickupViews = new Map<HealthPickup, PIXI.Container>();
      let lastDisplayedSeconds = getRemainingSeconds(match);
      const spawnState = createSpawnState();
      const pendingEnemies = new Set<EnemyState>();
      let enemies: EnemyState[] = [];
      let score = 0;

      const enemyViews = new Map<EnemyState, EnemyView>();
      const projectileSprites = new Map<ProjectileState, PIXI.Sprite>();
      const splashGraphics = new Map<SplashState, PIXI.Graphics>();
      const destructionEffects: DestructionEffect[] = [];

      async function addEnemyToScene(enemy: EnemyState): Promise<void> {
        pendingEnemies.add(enemy);

        let ship: ShipView | undefined;
        let healthBar: HealthBarView | undefined;
        let committed = false;

        try {
          const images =
            enemy.kind === 'chaser'
              ? chaserImages
              : enemy.variant === 'healer'
                ? healerImages
                : enemy.variant === 'speed'
                  ? speedImages
                  : shooterImages;

          ship = await createShipView(images);

          if (cancelled || match.status !== 'playing' || player.health <= 0) {
            return;
          }

          healthBar = await createHealthBar();

          if (cancelled || match.status !== 'playing' || player.health <= 0) {
            return;
          }

          const boundsRadius = getSpriteBoundsRadius(ship.sprite);

          ship.update(enemy, 0);
          ship.container.position.set(enemy.x, enemy.y);
          ship.container.rotation =
            enemy.rotation + sceneConfig.shipRotationOffset;

          healthBar.update(enemy);
          healthBar.container.position.set(
            enemy.x,
            enemy.y - boundsRadius - sceneConfig.healthBarGap,
          );

          shipsLayer.addChild(ship.container);
          healthBarsLayer.addChild(healthBar.container);

          enemyViews.set(enemy, {
            ship,
            healthBar,
            boundsRadius,
          });

          enemies.push(enemy);
          committed = true;
        } catch (error: unknown) {
          console.error('Failed to create enemy view:', error);
        } finally {
          pendingEnemies.delete(enemy);

          if (!committed) {
            ship?.container.destroy({ children: true });
            healthBar?.container.destroy({ children: true });
          }
        }
      }

      function updateSpawns(deltaSeconds: number): void {
        const reservedEnemies = [...enemies, ...pendingEnemies];

        const newEnemies = updateEnemySpawning(
          spawnState,
          player,
          reservedEnemies,
          deltaSeconds,
          arenaConfig,
          islandColliders,
          Math.random,
          settings.spawnIntervalSeconds,
        );

        for (const enemy of newEnemies) {
          void addEnemyToScene(enemy);
        }
      }

      function updateCamera(): void {
        const camera = getCameraTransform(app.screen, arenaConfig, player);
        world.scale.set(camera.scale);
        world.position.set(camera.x, camera.y);
        ocean.tileScale.set(camera.scale);
        ocean.tilePosition.set(camera.x, camera.y);
      }
      function resizeScene(): void {
        ocean.width = app.screen.width;
        ocean.height = app.screen.height;
        updateCamera();
        if (match.status === 'finished' || paused) app.render();
      }

      function syncPlayerView(deltaSeconds: number): void {
        playerView.update(player, deltaSeconds);
        playerFeedback.update(player, combat.speedBoostSeconds, deltaSeconds);
        playerView.container.position.set(player.x, player.y);
        playerView.container.rotation =
          player.rotation + sceneConfig.shipRotationOffset;
        playerHealthBar.update(player);
        playerHealthBar.container.position.set(
          player.x,
          player.y - playerBoundsRadius - sceneConfig.healthBarGap,
        );
      }

      function syncEnemyViews(deltaSeconds: number): void {
        for (const [enemy, view] of enemyViews) {
          const corpseExpired =
            enemy.health <= 0 &&
            enemy.deadElapsedSeconds >= enemyConfig.corpseDurationSeconds;

          if (corpseExpired) {
            view.ship.container.destroy({ children: true });
            view.healthBar.container.destroy({ children: true });
            enemyViews.delete(enemy);
            continue;
          }

          view.ship.update(enemy, deltaSeconds);
          view.ship.container.position.set(enemy.x, enemy.y);
          view.ship.container.rotation =
            enemy.rotation + sceneConfig.shipRotationOffset;
          view.healthBar.update(enemy);
          view.healthBar.container.visible = enemy.health > 0;
          view.healthBar.container.position.set(
            enemy.x,
            enemy.y - view.boundsRadius - sceneConfig.healthBarGap,
          );
        }

        enemies = enemies.filter((enemy) => enemyViews.has(enemy));
      }

      function syncProjectileSprites(): void {
        const activeProjectiles = new Set(combat.projectiles);

        for (const [projectile, sprite] of projectileSprites) {
          if (!activeProjectiles.has(projectile)) {
            sprite.destroy();
            projectileSprites.delete(projectile);
          }
        }

        for (const projectile of combat.projectiles) {
          let sprite = projectileSprites.get(projectile);

          if (!sprite) {
            sprite = new PIXI.Sprite(projectileTexture);
            sprite.anchor.set(0.5);
            sprite.width = projectileConfig.radius * 2;
            sprite.height = projectileConfig.radius * 2;
            projectileSprites.set(projectile, sprite);
            projectilesLayer.addChild(sprite);
          }

          sprite.position.set(projectile.x, projectile.y);
        }
      }

      function syncSplashGraphics(): void {
        const activeSplashes = new Set(combat.splashes);

        for (const [splash, graphic] of splashGraphics) {
          if (!activeSplashes.has(splash)) {
            graphic.destroy();
            splashGraphics.delete(splash);
          }
        }

        for (const splash of combat.splashes) {
          let graphic = splashGraphics.get(splash);

          if (!graphic) {
            graphic = new PIXI.Graphics()
              .ellipse(
                0,
                0,
                splashAppearance.outerRadiusX,
                splashAppearance.outerRadiusY,
              )
              .stroke({
                color: splashAppearance.outerColor,
                width: splashAppearance.outerStrokeWidth,
              })
              .ellipse(
                0,
                0,
                splashAppearance.innerRadiusX,
                splashAppearance.innerRadiusY,
              )
              .stroke({
                color: splashAppearance.innerColor,
                width: splashAppearance.innerStrokeWidth,
              });

            graphic.position.set(splash.x, splash.y);
            splashGraphics.set(splash, graphic);
            effectsLayer.addChild(graphic);
          }

          const progress = Math.min(
            1,
            splash.elapsedSeconds / splashConfig.durationSeconds,
          );
          graphic.scale.set(1 + progress * splashAppearance.scaleGrowth);
          graphic.alpha = 1 - progress;
        }
      }

      function createDestructionEffect(
        x: number,
        y: number,
        points: number,
      ): void {
        const container = new PIXI.Container();
        container.position.set(x, y);

        const explosion = new PIXI.Sprite(explosionTexture);
        explosion.anchor.set(0.5);
        explosion.scale.set(destructionAppearance.initialScale);

        const label = new PIXI.Text({
          text: `+${points}`,
          style: {
            fontFamily: destructionAppearance.fontFamily,
            fontSize: destructionAppearance.fontSize,
            fontWeight: 'bold',
            fill: destructionAppearance.textColor,
            stroke: {
              color: destructionAppearance.textStrokeColor,
              width: destructionAppearance.textStrokeWidth,
            },
          },
        });

        label.anchor.set(0.5);
        label.y = destructionAppearance.labelOffsetY;
        label.visible = points > 0;
        container.addChild(explosion, label);
        effectsLayer.addChild(container);
        destructionEffects.push({
          container,
          explosion,
          label,
          elapsedSeconds: 0,
        });
      }

      function updateDestructionEffects(deltaSeconds: number): void {
        for (let index = destructionEffects.length - 1; index >= 0; index--) {
          const effect = destructionEffects[index];
          if (!effect) continue;

          effect.elapsedSeconds += deltaSeconds;
          const progress = Math.min(
            1,
            effect.elapsedSeconds / destructionAppearance.durationSeconds,
          );

          effect.explosion.scale.set(
            destructionAppearance.initialScale +
              progress * destructionAppearance.scaleGrowth,
          );
          effect.label.y =
            destructionAppearance.labelOffsetY -
            progress * destructionAppearance.labelRiseDistance;
          effect.container.alpha = 1 - progress;

          if (progress >= 1) {
            effect.container.destroy({ children: true });
            destructionEffects.splice(index, 1);
          }
        }
      }

      function handleCombatEvents(events: readonly CombatEvent[]): void {
        let scoreChanged = false;

        for (const event of events) {
          switch (event.type) {
            case 'shotFired':
              gameAudio?.play(
                event.action === 'fireFront' ? 'frontShot' : 'broadside',
              );
              break;
            case 'enemyShotFired':
              gameAudio?.play('frontShot');
              break;
            case 'waterHit':
              gameAudio?.play('waterHit');
              break;
            case 'enemyDestroyed':
              createDestructionEffect(event.x, event.y, event.points);
              crew.spawn(event.x, event.y);
              gameAudio?.play('explosion');
              gameAudio?.play('enemySinking');

              if (event.points > 0) {
                if (event.reward === 'speed')
                  combat.speedBoostSeconds = rewardConfig.boostDurationSeconds;
                if (event.reward === 'heal')
                  pickups.push({
                    x: event.x,
                    y: event.y,
                    remainingSeconds: rewardConfig.pickupLifetimeSeconds,
                  });
                score += event.points;
                scoreChanged = true;
                gameAudio?.play('score');
              }
              break;
          }
        }

        if (scoreChanged) onScoreChange(score);
      }

      function syncLowHealthAudio(): void {
        if (getHealthStage(player) === 'red') {
          gameAudio?.play('lowHealth');
        } else {
          gameAudio?.stop('lowHealth');
        }
      }

      function syncPickups(): void {
        const active = new Set(pickups);
        for (const [pickup, view] of pickupViews)
          if (!active.has(pickup)) {
            view.destroy({ children: true });
            pickupViews.delete(pickup);
          }
        for (const pickup of pickups) {
          let view = pickupViews.get(pickup);
          if (!view) {
            view = new PIXI.Container();
            const halo = new PIXI.Graphics()
              .circle(0, 0, 34)
              .fill({ color: 0x20ff6b, alpha: 0.38 })
              .stroke({ color: 0x66ff95, alpha: 0.95, width: 3 });
            const wood = new PIXI.Sprite(woodTexture);
            wood.anchor.set(0.5);
            const label = new PIXI.Text({
              text: `HEAL +${rewardConfig.healAmount}`,
              style: {
                fontFamily: 'monospace',
                fontSize: 24,
                fontWeight: 'bold',
                fill: 0x64ff8e,
                stroke: { color: 0x073b19, width: 4 },
              },
            });
            label.anchor.set(0.5);
            label.y = -43;
            view.addChild(halo, wood, label);
            effectsLayer.addChild(view);
            pickupViews.set(pickup, view);
          }
          view.position.set(pickup.x, pickup.y);
          view.alpha = 0.95 + Math.sin(pickup.remainingSeconds * 4) * 0.05;
        }
      }
      function pause(): void {
        if (cancelled || paused || match.result) return;
        paused = true;
        Object.assign(touchInput, createPlayerInput());
        unbindKeyboardInput?.();
        unbindKeyboardInput = undefined;
        gameAudio?.stop('ocean');
        gameAudio?.stop('sailing');
        gameAudio?.stop('lowHealth');
        gameAudio?.play('gamePause');
        app.stop();
        onPauseChange(true);
      }
      function resume(): void {
        if (cancelled || !paused || match.result) return;
        paused = false;
        skipNextDelta = true;
        unbindKeyboardInput = bindKeyboardInput(keyboardInput);
        gameAudio?.play('gameResume');
        gameAudio?.play('ocean');
        syncLowHealthAudio();
        onPauseChange(false);
        app.start();
      }
      function onVisibilityChange(): void {
        if (document.hidden) pause();
      }
      function onPauseKey(event: KeyboardEvent): void {
        if (
          event.code !== 'Escape' ||
          event.defaultPrevented ||
          event.repeat ||
          paused ||
          match.result
        )
          return;
        // Suppress the browser's native cancel action when opening the dialog.
        event.preventDefault();
        pause();
      }
      controls.pause = pause;
      controls.resume = resume;
      controls.setInput = (action, pressed) => {
        if (!paused && !match.result) touchInput[action] = pressed;
      };

      function updateFrame(ticker: PIXI.Ticker): void {
        if (match.status !== 'playing' || paused) return;
        if (skipNextDelta) {
          skipNextDelta = false;
          return;
        }
        for (const action of Object.keys(input) as (keyof PlayerInput)[])
          input[action] = keyboardInput[action] || touchInput[action];
        const previousHealth = player.health;
        const remainingDuration = Math.max(
          0,
          match.durationSeconds - match.elapsedSeconds,
        );

        const deltaSeconds = Math.min(
          ticker.deltaMS / sceneConfig.millisecondsPerSecond,
          remainingDuration,
        );

        const previousPlayerPosition = {
          x: player.x,
          y: player.y,
        };

        updatePlayerMovement(player, input, deltaSeconds);

        constrainPlayerToArena(player, arenaConfig, playerBoundsRadius);

        const hitIsland = isCirclePathBlocked(
          previousPlayerPosition,
          player,
          getShipIslandRadius(),
          islandColliders,
        );

        if (hitIsland) {
          player.x = previousPlayerPosition.x;
          player.y = previousPlayerPosition.y;
          player.speed = 0;
        }
        updateSpawns(deltaSeconds);
        updateCombat(
          combat,
          player,
          input,
          deltaSeconds,
          arenaConfig,
          enemies,
          islandColliders,
          islandCannons,
        );
        cannonLayer.update();

        const healthBeforePickup = player.health;
        if (healthBeforePickup < previousHealth) playerView.shakeOnDamage();
        collectHealthPickups(pickups, player, deltaSeconds);
        if (player.health > healthBeforePickup) playerFeedback.flashHealing();
        syncPickups();
        wake.update([player, ...enemies], deltaSeconds);
        crew.update(deltaSeconds);
        const playerMoved =
          player.health > 0 &&
          Math.hypot(
            player.x - previousPlayerPosition.x,
            player.y - previousPlayerPosition.y,
          ) > 0;
        if (playerMoved) gameAudio?.play('sailing');
        else gameAudio?.stop('sailing');
        updateDestructionEffects(deltaSeconds);
        handleCombatEvents(combat.events);
        const boostSeconds = Math.ceil(combat.speedBoostSeconds);
        if (boostSeconds !== lastBoostSeconds) {
          lastBoostSeconds = boostSeconds;
          onBoostChange(boostSeconds);
        }
        syncLowHealthAudio();

        if (player.health !== previousHealth) onHealthChange(player.health);

        updateCamera();
        syncPlayerView(deltaSeconds);
        syncEnemyViews(deltaSeconds);
        syncProjectileSprites();
        syncSplashGraphics();

        advanceMatch(match, deltaSeconds, player.health, score);

        const remainingSeconds = getRemainingSeconds(match);

        if (remainingSeconds !== lastDisplayedSeconds) {
          lastDisplayedSeconds = remainingSeconds;
          onTimeChange(remainingSeconds);
        }

        if (match.result !== null) {
          unbindKeyboardInput?.();
          unbindKeyboardInput = undefined;

          gameAudio?.stop('ocean');
          gameAudio?.stop('sailing');
          gameAudio?.stop('lowHealth');

          app.stop();
          app.render();

          gameAudio?.play(
            match.result.reason === 'timeUp' ? 'gameComplete' : 'gameOver',
          );
          onMatchEnd(match.result);
        }
      }

      gameAudio = await createGameAudio().catch((error: unknown) => {
        console.error('Failed to load game audio:', error);
        return undefined;
      });

      if (cancelled) {
        gameAudio?.destroy();
        gameAudio = undefined;
        return;
      }

      window.addEventListener('blur', pause);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('keydown', onPauseKey);
      app.renderer.on('resize', resizeScene);
      app.ticker.add(updateFrame);
      const resizeObserver = new ResizeObserver(() => {
        if (!cancelled) app.resize();
      });
      resizeObserver.observe(containerRef.current!);
      unbindScene = () => {
        resizeObserver.disconnect();
        window.removeEventListener('blur', pause);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('keydown', onPauseKey);
        app.renderer.off('resize', resizeScene);
        app.ticker.remove(updateFrame);
      };
      unbindKeyboardInput = bindKeyboardInput(keyboardInput);

      resizeScene();
      syncPlayerView(0);
      syncEnemyViews(0);
      onScoreChange(score);
      onHealthChange(player.health);
      onTimeChange(lastDisplayedSeconds);
      syncLowHealthAudio();
      containerRef.current?.appendChild(app.canvas);
      setLoadState('ready');
      gameAudio?.play('ocean');
      gameAudio?.play('gameStart');
      app.start();
      if (document.hidden || !document.hasFocus()) pause();
    }

    void start().catch((error: unknown) => {
      if (cancelled) return;
      setLoadState('error');
      console.error('Failed to initialize PixiJS:', error);
      cleanup();
    });

    return cleanup;
  }, [
    settings,
    controls,
    onPauseChange,
    onBoostChange,
    onScoreChange,
    onHealthChange,
    onTimeChange,
    onMatchEnd,
    loadAttempt,
  ]);

  return (
    <>
      <div className="game-canvas" ref={containerRef} />
      {loadState !== 'ready' && (
        <div className="loading-overlay" role="status">
          {loadState === 'loading' ? (
            'Loading the sea…'
          ) : (
            <>
              <p>Could not load the battle.</p>
              <button
                className="gold-button"
                onClick={() => setLoadAttempt((value) => value + 1)}
              >
                TRY AGAIN
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

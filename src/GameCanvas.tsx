import * as React from 'react';
import * as PIXI from 'pixi.js';

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
  isShipPathBlocked,
} from './game/islandGeometry';

interface GameCanvasProps {
  onScoreChange: (score: number) => void;
  onHealthChange: (health: number) => void;
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
  fontFamily: 'Arial',
  fontSize: 28,
  textColor: '#ffe08a',
  textStrokeColor: '#38240b',
  textStrokeWidth: 4,
};

function getSpriteBoundsRadius(sprite: PIXI.Sprite): number {
  return Math.hypot(sprite.texture.width, sprite.texture.height) / 2;
}

export function GameCanvas({ onScoreChange, onHealthChange }: GameCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const app = new PIXI.Application();
    const input = createPlayerInput();
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
        resizeTo: window,
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
      ]);

      if (cancelled) return;

      const ocean = new PIXI.TilingSprite({
        texture: oceanTexture,
        width: app.screen.width,
        height: app.screen.height,
      });
      const world = new PIXI.Container();
      const shipsLayer = new PIXI.Container();
      const projectilesLayer = new PIXI.Container();
      const effectsLayer = new PIXI.Container();
      const healthBarsLayer = new PIXI.Container();

      app.stage.addChild(ocean, world);
      world.addChild(
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

      world.addChildAt(islandLayer, 0);

      const playerView = await createShipView(playerImages);

      if (cancelled) {
        playerView.sprite.destroy({ children: true });
        return;
      }

      shipsLayer.addChild(playerView.sprite);
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
          const images = enemy.kind === 'chaser' ? chaserImages : shooterImages;

          ship = await createShipView(images);

          if (cancelled || player.health <= 0) return;

          healthBar = await createHealthBar();

          if (cancelled || player.health <= 0) return;

          const boundsRadius = getSpriteBoundsRadius(ship.sprite);

          ship.update(enemy, 0);
          ship.sprite.position.set(enemy.x, enemy.y);
          ship.sprite.rotation =
            enemy.rotation + sceneConfig.shipRotationOffset;

          healthBar.update(enemy);
          healthBar.container.position.set(
            enemy.x,
            enemy.y - boundsRadius - sceneConfig.healthBarGap,
          );

          shipsLayer.addChild(ship.sprite);
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
            ship?.sprite.destroy({ children: true });
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
        );

        for (const enemy of newEnemies) {
          void addEnemyToScene(enemy);
        }
      }

      function resizeScene(): void {
        const scale = Math.min(
          app.screen.width / arenaConfig.width,
          app.screen.height / arenaConfig.height,
        );

        world.scale.set(scale);
        world.position.set(
          (app.screen.width - arenaConfig.width * scale) / 2,
          (app.screen.height - arenaConfig.height * scale) / 2,
        );

        ocean.width = app.screen.width;
        ocean.height = app.screen.height;
        ocean.tileScale.set(scale);
        ocean.tilePosition.set(world.x, world.y);
      }

      function syncPlayerView(deltaSeconds: number): void {
        playerView.update(player, deltaSeconds);
        playerView.sprite.position.set(player.x, player.y);
        playerView.sprite.rotation =
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
            view.ship.sprite.destroy({ children: true });
            view.healthBar.container.destroy({ children: true });
            enemyViews.delete(enemy);
            continue;
          }

          view.ship.update(enemy, deltaSeconds);
          view.ship.sprite.position.set(enemy.x, enemy.y);
          view.ship.sprite.rotation =
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
              gameAudio?.play('explosion');
              gameAudio?.play('enemySinking');

              if (event.points > 0) {
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

      function updateFrame(ticker: PIXI.Ticker): void {
        const previousHealth = player.health;
        const deltaSeconds = ticker.deltaMS / sceneConfig.millisecondsPerSecond;

        const previousPlayerPosition = {
          x: player.x,
          y: player.y,
        };

        updatePlayerMovement(player, input, deltaSeconds);

        constrainPlayerToArena(player, arenaConfig, playerBoundsRadius);

        const hitIsland = isShipPathBlocked(
          previousPlayerPosition,
          player,
          playerBoundsRadius,
          islandColliders,
        );

        if (hitIsland) {
          player.x = previousPlayerPosition.x;
          player.y = previousPlayerPosition.y;
          player.speed = 0;
        }
        updateSpawns(deltaSeconds);
        updateCombat(combat, player, input, deltaSeconds, arenaConfig, enemies);

        updateDestructionEffects(deltaSeconds);
        handleCombatEvents(combat.events);
        syncLowHealthAudio();

        if (player.health !== previousHealth) onHealthChange(player.health);

        syncPlayerView(deltaSeconds);
        syncEnemyViews(deltaSeconds);
        syncProjectileSprites();
        syncSplashGraphics();
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

      app.renderer.on('resize', resizeScene);
      app.ticker.add(updateFrame);
      unbindScene = () => {
        app.renderer.off('resize', resizeScene);
        app.ticker.remove(updateFrame);
      };
      unbindKeyboardInput = bindKeyboardInput(input);

      resizeScene();
      syncPlayerView(0);
      syncEnemyViews(0);
      onScoreChange(score);
      onHealthChange(player.health);
      syncLowHealthAudio();
      containerRef.current?.appendChild(app.canvas);
      gameAudio?.play('ocean');
      app.start();
    }

    void start().catch((error: unknown) => {
      console.error('Failed to initialize PixiJS:', error);
      cleanup();
    });

    return cleanup;
  }, [onScoreChange, onHealthChange]);

  return <div ref={containerRef} />;
}

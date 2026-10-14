import * as React from 'react';
import * as PIXI from 'pixi.js';
import playerShipImageUrl from '../assets/png/default/ships/ship_2.png';
import oceanImageUrl from '../assets/png/default/tiles/tile_73.png';
import { createPlayerInput } from './game/input';
import { bindKeyboardInput } from './game/keyboard';
import {
  constrainPlayerToArena,
  updatePlayerMovement,
  type PlayerState,
} from './game/player';
import cannonBallImageUrl from '../assets/png/default/ship_parts/cannon_ball.png';
import {
  createCombatState,
  projectileConfig,
  updateCombat,
  splashConfig,
  type ProjectileState,
  type SplashState,
} from './game/combat';
import { createHealthBar } from './game/createHealthBar';
import enemyShipImageUrl from '../assets/png/default/ships/ship_1.png';
import { createStationaryEnemy } from './game/enemy';
import explosionImageUrl from '../assets/png/default/effects/explosion_1.png';
import { createGameAudio } from './game/audio';

interface GameCanvasProps {
  onScoreChange: (score: number) => void;
}

export function GameCanvas({ onScoreChange }: GameCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const app = new PIXI.Application();
    let cancelled = false;
    let initialized = false;
    const input = createPlayerInput();
    let unbindKeyboardInput: (() => void) | undefined;
    let gameAudio: Awaited<ReturnType<typeof createGameAudio>> | undefined;

    async function start() {
      await app.init({
        resizeTo: window,
        background: '#167b9c',
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoStart: false,
      });

      initialized = true;

      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      let score = 0;

      const oceanTexture = await PIXI.Assets.load<PIXI.Texture>(oceanImageUrl);

      if (cancelled) return;

      const ocean = new PIXI.TilingSprite({
        texture: oceanTexture,
        width: app.screen.width,
        height: app.screen.height,
      });

      app.stage.addChild(ocean);

      const playerShipTexture =
        await PIXI.Assets.load<PIXI.Texture>(playerShipImageUrl);

      if (cancelled) return;

      const playerShip = new PIXI.Sprite(playerShipTexture);

      playerShip.anchor.set(0.5);
      const shipRotationOffset = Math.PI;

      const player: PlayerState = {
        x: app.screen.width / 2,
        y: app.screen.height / 2,
        rotation: 0,
        health: 100,
        maxHealth: 100,
        speed: 0,
      };

      function syncPlayerSprite() {
        playerShip.position.set(player.x, player.y);
        playerShip.rotation = player.rotation + shipRotationOffset;
      }

      syncPlayerSprite();

      function resizeScene() {
        ocean.width = app.screen.width;
        ocean.height = app.screen.height;
      }

      app.renderer.on('resize', resizeScene);

      const projectileTexture =
        await PIXI.Assets.load<PIXI.Texture>(cannonBallImageUrl);

      if (cancelled) return;

      const combat = createCombatState();

      const projectileSprites = new Map<ProjectileState, PIXI.Sprite>();

      const splashGraphics = new Map<SplashState, PIXI.Graphics>();

      const playerBoundsRadius =
        Math.hypot(playerShipTexture.width, playerShipTexture.height) / 2;

      const playerHealthBar = await createHealthBar();

      const enemyTexture =
        await PIXI.Assets.load<PIXI.Texture>(enemyShipImageUrl);

      if (cancelled) return;

      const enemyHealthBar = await createHealthBar();

      if (cancelled) {
        enemyHealthBar.container.destroy({ children: true });
        return;
      }

      const enemy = createStationaryEnemy(
        player.x,
        Math.max(playerBoundsRadius, player.y - 220),
      );

      const enemySprite = new PIXI.Sprite(enemyTexture);

      enemySprite.anchor.set(0.5);

      const enemyBoundsRadius =
        Math.hypot(enemyTexture.width, enemyTexture.height) / 2;

      app.stage.addChild(enemySprite, enemyHealthBar.container);

      function syncEnemyView() {
        const isAlive = enemy.health > 0;

        enemySprite.visible = isAlive;
        enemyHealthBar.container.visible = isAlive;

        enemySprite.position.set(enemy.x, enemy.y);
        enemySprite.rotation = enemy.rotation + shipRotationOffset;

        enemyHealthBar.update(enemy);
        enemyHealthBar.container.position.set(
          enemy.x,
          enemy.y - enemyBoundsRadius - healthBarGap,
        );
      }

      if (cancelled) {
        playerHealthBar.container.destroy({ children: true });
        return;
      }

      app.stage.addChild(playerHealthBar.container);

      app.stage.addChild(playerShip);

      containerRef.current?.appendChild(app.canvas);

      resizeScene();

      unbindKeyboardInput = bindKeyboardInput(input);

      function syncProjectileSprites() {
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
            app.stage.addChild(sprite);
          }

          sprite.position.set(projectile.x, projectile.y);
        }
      }

      function syncSplashGraphics() {
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
            graphic = new PIXI.Graphics();

            graphic.ellipse(0, 0, 8, 4).stroke({ color: 0xd9f8ff, width: 2 });

            graphic.ellipse(0, 0, 4, 2).stroke({ color: 0xffffff, width: 1 });

            graphic.position.set(splash.x, splash.y);

            splashGraphics.set(splash, graphic);
            app.stage.addChild(graphic);
          }

          const progress = Math.min(
            1,
            splash.elapsedSeconds / splashConfig.durationSeconds,
          );

          graphic.scale.set(1 + progress * 2);
          graphic.alpha = 1 - progress;
        }
      }

      const healthBarGap = 8;

      function syncPlayerHealthBar() {
        playerHealthBar.update(player);

        playerHealthBar.container.position.set(
          player.x,
          player.y - playerBoundsRadius - healthBarGap,
        );
      }

      syncPlayerHealthBar();

      const explosionTexture =
        await PIXI.Assets.load<PIXI.Texture>(explosionImageUrl);

      if (cancelled) return;

      const destructionEffects: {
        container: PIXI.Container;
        explosion: PIXI.Sprite;
        label: PIXI.Text;
        elapsedSeconds: number;
      }[] = [];

      const destructionEffectDuration = 0.8;

      function createDestructionEffect(x: number, y: number) {
        const container = new PIXI.Container();
        container.position.set(x, y);

        const explosion = new PIXI.Sprite(explosionTexture);
        explosion.anchor.set(0.5);
        explosion.scale.set(0.6);

        const label = new PIXI.Text({
          text: '+1',
          style: {
            fontFamily: 'Arial',
            fontSize: 28,
            fontWeight: 'bold',
            fill: '#ffe08a',
            stroke: {
              color: '#38240b',
              width: 4,
            },
          },
        });

        label.anchor.set(0.5);
        label.y = -40;

        container.addChild(explosion, label);
        app.stage.addChild(container);

        destructionEffects.push({
          container,
          explosion,
          label,
          elapsedSeconds: 0,
        });
      }

      function updateDestructionEffects(deltaSeconds: number) {
        for (let index = destructionEffects.length - 1; index >= 0; index--) {
          const effect = destructionEffects[index];

          effect.elapsedSeconds += deltaSeconds;

          const progress = Math.min(
            1,
            effect.elapsedSeconds / destructionEffectDuration,
          );

          effect.explosion.scale.set(0.6 + progress);
          effect.label.y = -40 - progress * 35;
          effect.container.alpha = 1 - progress;

          if (progress === 1) {
            effect.container.destroy({ children: true });
            destructionEffects.splice(index, 1);
          }
        }
      }

      function updateFrame(ticker: PIXI.Ticker) {
        const deltaSeconds = ticker.deltaMS / 1000;

        const bounds = {
          width: app.screen.width,
          height: app.screen.height,
        };

        const hasLowHealth =
          player.maxHealth > 0 &&
          player.health > 0 &&
          player.health / player.maxHealth <= 0.3;

        if (hasLowHealth) {
          gameAudio?.play('lowHealth');
        } else {
          gameAudio?.stop('lowHealth');
        }

        updatePlayerMovement(player, input, deltaSeconds);

        constrainPlayerToArena(player, bounds, playerBoundsRadius);

        updateCombat(combat, player, input, deltaSeconds, bounds, enemy);

        updateDestructionEffects(deltaSeconds);

        for (const event of combat.events) {
          switch (event.type) {
            case 'shotFired':
              gameAudio?.play(
                event.action === 'fireFront' ? 'frontShot' : 'broadside',
              );
              break;

            case 'waterHit':
              gameAudio?.play('waterHit');
              break;

            case 'enemyDestroyed':
              score += 1;
              onScoreChange(score);

              createDestructionEffect(event.x, event.y);

              gameAudio?.play('explosion');
              gameAudio?.play('score');
              gameAudio?.play('enemySinking');
              break;
          }
        }

        syncPlayerSprite();
        syncProjectileSprites();
        syncSplashGraphics();
        syncPlayerHealthBar();
        syncEnemyView();
      }

      gameAudio = await createGameAudio().catch((error) => {
        console.error('Failed to load game audio:', error);
        return undefined;
      });

      if (cancelled) {
        gameAudio?.destroy();
        return;
      }

      gameAudio?.play('ocean');

      app.ticker.add(updateFrame);
      app.start();
    }

    void start().catch((error) => {
      console.error('Failed to initialize PixiJS:', error);
    });

    return () => {
      cancelled = true;

      unbindKeyboardInput?.();
      gameAudio?.destroy();

      if (initialized) {
        app.destroy(true, { children: true });
      }
    };
  }, [onScoreChange]);

  return <div ref={containerRef} />;
}

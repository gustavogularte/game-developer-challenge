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
  type ProjectileState,
} from './game/combat';

export function GameCanvas() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const app = new PIXI.Application();
    let cancelled = false;
    let initialized = false;
    const input = createPlayerInput();
    let unbindKeyboardInput: (() => void) | undefined;

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

      const playerBoundsRadius =
        Math.hypot(playerShipTexture.width, playerShipTexture.height) / 2;

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

      function updateFrame(ticker: PIXI.Ticker) {
        const deltaSeconds = ticker.deltaMS / 1000;

        const bounds = {
          width: app.screen.width,
          height: app.screen.height,
        };

        updatePlayerMovement(player, input, deltaSeconds);

        constrainPlayerToArena(player, bounds, playerBoundsRadius);

        updateCombat(combat, player, input, deltaSeconds, bounds);

        syncPlayerSprite();
        syncProjectileSprites();
      }

      app.ticker.add(updateFrame);
      app.start();
    }

    void start().catch((error) => {
      console.error('Failed to initialize PixiJS:', error);
    });

    return () => {
      cancelled = true;
      unbindKeyboardInput?.();

      if (initialized) {
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={containerRef} />;
}

import * as React from 'react';
import * as PIXI from 'pixi.js';
import playerShipImageUrl from '../assets/png/default/ships/ship_2.png';
import oceanImageUrl from '../assets/png/default/tiles/tile_73.png';
import { createPlayerInput } from './game/input';
import { bindKeyboardInput } from './game/keyboard';
import { updatePlayerMovement, type PlayerState } from './game/player';

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

      app.stage.addChild(playerShip);

      containerRef.current?.appendChild(app.canvas);

      resizeScene();

      unbindKeyboardInput = bindKeyboardInput(input);

      function updateFrame(ticker: PIXI.Ticker) {
        const deltaSeconds = ticker.deltaMS / 1000;

        updatePlayerMovement(player, input, deltaSeconds);
        syncPlayerSprite();
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

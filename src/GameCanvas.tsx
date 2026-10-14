import * as React from 'react';
import * as PIXI from 'pixi.js';
import playerShipImageUrl from '../assets/png/default/ships/ship_14.png';

export function GameCanvas() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const app = new PIXI.Application();
    let cancelled = false;
    let initialized = false;

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

      const playerShipTexture =
        await PIXI.Assets.load<PIXI.Texture>(playerShipImageUrl);

      if (cancelled) return;

      const playerShip = new PIXI.Sprite(playerShipTexture);

      playerShip.anchor.set(0.5);
      playerShip.position.set(app.screen.width / 2, app.screen.height / 2);

      app.stage.addChild(playerShip);

      containerRef.current?.appendChild(app.canvas);
      app.render();
    }

    void start().catch((error) => {
      console.error('Failed to initialize PixiJS:', error);
    });

    return () => {
      cancelled = true;

      if (initialized) {
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={containerRef} />;
}

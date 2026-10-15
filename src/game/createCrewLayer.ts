import * as PIXI from 'pixi.js';

const crewUrls = import.meta.glob<string>(
  '../../assets/png/default/ship_parts/crew_*.png',
  { eager: true, query: '?url', import: 'default' },
);

export const crewEffectConfig = {
  countPerEnemy: 3,
  lifetimeSeconds: 2,
  shrinkDurationSeconds: 0.25,
  initialScale: 1.1,
  spawnRadius: 48,
  spawnRadiusStep: 7,
  driftPixels: 2,
  bobFrequency: 1.6,
  swayRadians: 0.12,
  rippleWidth: 10,
  rippleHeight: 4,
  rippleColor: 0xd6f5e9,
  rippleAlpha: 0.35,
};

interface FloatingCrew {
  view: PIXI.Container;
  x: number;
  y: number;
  phase: number;
  elapsedSeconds: number;
}

export async function createCrewLayer() {
  const textures = await Promise.all(
    Object.entries(crewUrls)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, url]) => PIXI.Assets.load<PIXI.Texture>(url)),
  );
  if (!textures.length) throw new Error('Missing crew sprites');
  const container = new PIXI.Container();
  container.eventMode = 'none';
  const floating: FloatingCrew[] = [];
  let destroyedEnemies = 0;

  function spawn(x: number, y: number): void {
    for (let index = 0; index < crewEffectConfig.countPerEnemy; index++) {
      const phase =
        (index / crewEffectConfig.countPerEnemy +
          destroyedEnemies / textures.length) *
        Math.PI *
        2;
      const radius =
        crewEffectConfig.spawnRadius + index * crewEffectConfig.spawnRadiusStep;
      const view = new PIXI.Container();
      const ripple = new PIXI.Graphics()
        .ellipse(
          0,
          0,
          crewEffectConfig.rippleWidth,
          crewEffectConfig.rippleHeight,
        )
        .stroke({
          color: crewEffectConfig.rippleColor,
          alpha: crewEffectConfig.rippleAlpha,
          width: 1,
        });
      const sprite = new PIXI.Sprite(
        textures[(destroyedEnemies + index) % textures.length],
      );
      sprite.anchor.set(0.5);
      view.addChild(ripple, sprite);
      const crew = {
        view,
        x: x + Math.cos(phase) * radius,
        y: y + Math.sin(phase) * radius,
        phase,
        elapsedSeconds: 0,
      };
      view.position.set(crew.x, crew.y);
      view.scale.set(crewEffectConfig.initialScale);
      container.addChild(view);
      floating.push(crew);
    }
    destroyedEnemies++;
  }

  function update(deltaSeconds: number): void {
    for (let index = floating.length - 1; index >= 0; index--) {
      const crew = floating[index];
      crew.elapsedSeconds += Math.max(0, deltaSeconds);
      if (crew.elapsedSeconds >= crewEffectConfig.lifetimeSeconds) {
        crew.view.destroy({ children: true });
        floating.splice(index, 1);
        continue;
      }
      const phase =
        crew.phase +
        crew.elapsedSeconds * Math.PI * 2 * crewEffectConfig.bobFrequency;
      crew.view.position.set(
        crew.x + Math.sin(phase) * crewEffectConfig.driftPixels,
        crew.y + Math.cos(phase) * crewEffectConfig.driftPixels,
      );
      crew.view.rotation = Math.sin(phase) * crewEffectConfig.swayRadians;
      const shrinkStart =
        crewEffectConfig.lifetimeSeconds -
        crewEffectConfig.shrinkDurationSeconds;
      const shrinkProgress = Math.max(
        0,
        (crew.elapsedSeconds - shrinkStart) /
          crewEffectConfig.shrinkDurationSeconds,
      );
      crew.view.scale.set(
        crewEffectConfig.initialScale * (1 - shrinkProgress * shrinkProgress),
      );
    }
  }
  return { container, spawn, update };
}

import * as PIXI from 'pixi.js';
import type { HealthState } from './health';

import frameImageUrl from '../../assets/png/default/ui/hud/health_frame.png';
import greenImageUrl from '../../assets/png/default/ui/hud/health_fill_green.png';
import amberImageUrl from '../../assets/png/default/ui/hud/health_fill_amber.png';
import redImageUrl from '../../assets/png/default/ui/hud/health_fill_red.png';

interface HealthBarView {
  container: PIXI.Container;
  update: (health: HealthState) => void;
}

const healthBarLayout = {
  fillX: 30,
  fillY: 15,
  fillWidth: 196,
  fillHeight: 20,
  scale: 0.4,
};

export async function createHealthBar(): Promise<HealthBarView> {
  const [frameTexture, greenTexture, amberTexture, redTexture] =
    await Promise.all([
      PIXI.Assets.load<PIXI.Texture>(frameImageUrl),
      PIXI.Assets.load<PIXI.Texture>(greenImageUrl),
      PIXI.Assets.load<PIXI.Texture>(amberImageUrl),
      PIXI.Assets.load<PIXI.Texture>(redImageUrl),
    ]);

  const container = new PIXI.Container();
  container.eventMode = 'none';

  const frame = new PIXI.Sprite(frameTexture);
  const fill = new PIXI.Sprite(greenTexture);

  const fillMask = new PIXI.Graphics()
    .rect(0, 0, healthBarLayout.fillWidth, healthBarLayout.fillHeight)
    .fill(0xffffff);

  fillMask.position.set(healthBarLayout.fillX, healthBarLayout.fillY);

  container.addChild(frame, fill, fillMask);
  fill.mask = fillMask;

  container.pivot.set(frameTexture.width / 2, frameTexture.height);

  container.scale.set(healthBarLayout.scale);

  function update(health: HealthState): void {
    const ratio =
      health.maxHealth > 0
        ? Math.min(1, Math.max(0, health.health / health.maxHealth))
        : 0;

    if (ratio <= 0.3) {
      fill.texture = redTexture;
    } else if (ratio <= 0.6) {
      fill.texture = amberTexture;
    } else {
      fill.texture = greenTexture;
    }

    fillMask.scale.x = ratio;
    fill.visible = ratio > 0;
  }

  return { container, update };
}

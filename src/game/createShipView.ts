import * as PIXI from 'pixi.js';
import { getHealthStage } from './health';
import type { HealthStage, HealthState } from './health';

import fireOneImageUrl from '../../assets/png/default/effects/fire_1.png';
import fireTwoImageUrl from '../../assets/png/default/effects/fire_2.png';

type ShipImages = Record<HealthStage, string>;

export async function createShipView(images: ShipImages) {
  const [
    green,
    amber,
    red,
    dead,
    fireOneTexture,
    fireTwoTexture,
  ] = await Promise.all([
    PIXI.Assets.load<PIXI.Texture>(images.green),
    PIXI.Assets.load<PIXI.Texture>(images.amber),
    PIXI.Assets.load<PIXI.Texture>(images.red),
    PIXI.Assets.load<PIXI.Texture>(images.dead),
    PIXI.Assets.load<PIXI.Texture>(fireOneImageUrl),
    PIXI.Assets.load<PIXI.Texture>(fireTwoImageUrl),
  ]);

  const textures: Record<HealthStage, PIXI.Texture> = {
    green,
    amber,
    red,
    dead,
  };

  const sprite = new PIXI.Sprite(green);
  sprite.anchor.set(0.5);

  const fireOne = new PIXI.Sprite(fireOneTexture);
  fireOne.anchor.set(0.5, 1);
  fireOne.position.set(-10, -12);
  fireOne.rotation = Math.PI;
  fireOne.visible = false;

  const fireTwo = new PIXI.Sprite(fireTwoTexture);
  fireTwo.anchor.set(0.5, 1);
  fireTwo.position.set(10, 18);
  fireTwo.rotation = Math.PI;
  fireTwo.visible = false;

  sprite.addChild(fireOne, fireTwo);

  let elapsedSeconds = 0;

  function update(
    health: HealthState,
    deltaSeconds: number,
  ): void {
    elapsedSeconds += deltaSeconds;

    const stage = getHealthStage(health);

    sprite.texture = textures[stage];

    fireOne.visible = stage === 'red';
    fireTwo.visible = stage === 'amber' || stage === 'red';

    fireOne.scale.set(
      1 + Math.sin(elapsedSeconds * 13) * 0.08,
    );

    fireTwo.scale.set(
      1 + Math.sin(elapsedSeconds * 17 + 1) * 0.08,
    );
  }

  return { sprite, update };
}
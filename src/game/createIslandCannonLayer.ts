import * as PIXI from "pixi.js";
import cannonImageUrl from "../../assets/png/default/ship_parts/cannon_mobile.png";
import hullImageUrl from "../../assets/png/default/ship_parts/hull_small_3.png";
import crewImageUrl from "../../assets/png/default/ship_parts/crew_1.png";
import { islandCannonConfig, type IslandCannonState } from "./islandCannons";

const appearance = {
  cannonScale: 1.5,
  wreckScale: 0.85,
  wreckOffsetX: -44,
  wreckOffsetY: -36,
  wreckRotation: -Math.PI / 5,
  crewScale: 1.25,
  crewOffsetX: -32,
  crewOffsetY: 14,
  recoilDistance: 4,
  recoilSeconds: 0.16,
  muzzleOffset: 29,
  flashRadius: 6,
  flashSeconds: 0.08,
  flashColor: 0xffd66b,
};

export async function createIslandCannonLayer(cannons: readonly IslandCannonState[]) {
  const [cannonTexture, crewTexture, hullTexture] = await Promise.all([
    PIXI.Assets.load<PIXI.Texture>(cannonImageUrl),
    PIXI.Assets.load<PIXI.Texture>(crewImageUrl),
    PIXI.Assets.load<PIXI.Texture>(hullImageUrl),
  ]);
  const container = new PIXI.Container();
  container.eventMode = "none";
  const views = cannons.map((state) => {
    const mount = new PIXI.Container();
    mount.position.set(state.x, state.y);
    // The PNG faces east; the simulation's zero angle faces north.
    mount.rotation = state.rotation - Math.PI / 2;
    const wreck = new PIXI.Sprite(hullTexture);
    wreck.anchor.set(0.5);
    wreck.scale.set(appearance.wreckScale);
    wreck.position.set(appearance.wreckOffsetX, appearance.wreckOffsetY);
    wreck.rotation = appearance.wreckRotation;
    const cannon = new PIXI.Sprite(cannonTexture);
    cannon.anchor.set(0.5);
    cannon.scale.set(appearance.cannonScale);
    const crew = new PIXI.Sprite(crewTexture);
    crew.anchor.set(0.5);
    crew.scale.set(appearance.crewScale);
    crew.position.set(appearance.crewOffsetX, appearance.crewOffsetY);
    const flash = new PIXI.Graphics()
      .circle(appearance.muzzleOffset, 0, appearance.flashRadius)
      .fill(appearance.flashColor);
    flash.visible = false;
    mount.addChild(wreck, crew, cannon, flash);
    container.addChild(mount);
    return { state, cannon, crew, flash };
  });
  return {
    container,
    update(): void {
      for (const { state, cannon, crew, flash } of views) {
        const sinceShot = islandCannonConfig.cooldownSeconds - state.cooldownSeconds;
        const recoil = Math.max(0, 1 - sinceShot / appearance.recoilSeconds);
        cannon.x = -appearance.recoilDistance * recoil;
        crew.x = appearance.crewOffsetX - recoil * appearance.recoilDistance;
        flash.visible = sinceShot >= 0 && sinceShot < appearance.flashSeconds;
      }
    },
  };
}

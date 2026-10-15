import * as PIXI from "pixi.js";
import { islandConfig, type IslandDefinition } from "./islands";
import { createRoundedOutline } from "./islandGeometry";

const tileImageUrls = import.meta.glob<string>(
  "../../assets/png/default/tiles/*.png",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

const islandAppearance = {
  shallowWaterColor: 0x76d5df,
  shallowWaterWidth: 24,
  shallowWaterAlpha: 0.35,

  sandEdgeColor: 0xc89d61,
  sandEdgeWidth: 5,
  sandEdgeAlpha: 0.25,

  grassEdgeColor: 0x426e31,
  grassEdgeWidth: 3,
  grassEdgeAlpha: 0.2,
};

export async function createIslandLayer(
  islands: readonly IslandDefinition[],
): Promise<PIXI.Container> {
  const entries = await Promise.all(
    Object.entries(tileImageUrls).map(async ([path, url]) => {
      const match = path.match(/tile_(\d+)\.png$/);

      if (!match?.[1]) {
        throw new Error(`Invalid tile filename: ${path}`);
      }

      const texture = await PIXI.Assets.load<PIXI.Texture>(url);

      return [Number(match[1]), texture] as const;
    }),
  );

  const textures = new Map(entries);
  const layer = new PIXI.Container();

  function getTexture(tileId: number): PIXI.Texture {
    const texture = textures.get(tileId);

    if (!texture) {
      throw new Error(`Missing tile texture: ${tileId}`);
    }

    return texture;
  }

  try {
    for (const island of islands) {
      const container = new PIXI.Container();

      container.position.set(island.x, island.y);
      layer.addChild(container);

      const shallowWater = new PIXI.Graphics()
        .poly(createRoundedOutline(island.outline, island.cornerRadius))
        .stroke({
          color: islandAppearance.shallowWaterColor,
          width: islandAppearance.shallowWaterWidth,
          alpha: islandAppearance.shallowWaterAlpha,
        });

      container.addChild(shallowWater);

      const sand = new PIXI.Graphics()
        .poly(createRoundedOutline(island.outline, island.cornerRadius))
        .fill({
          texture: getTexture(islandConfig.sandTextureId),
          textureSpace: "global",
        })
        .stroke({
          color: islandAppearance.sandEdgeColor,
          width: islandAppearance.sandEdgeWidth,
          alpha: islandAppearance.sandEdgeAlpha,
        });

      container.addChild(sand);

      if (island.grassOutline.length > 0) {
        const grass = new PIXI.Graphics()
          .poly(createRoundedOutline(island.grassOutline, island.cornerRadius))
          .fill({
            texture: getTexture(islandConfig.grassTextureId),
            textureSpace: "global",
          })
          .stroke({
            color: islandAppearance.grassEdgeColor,
            width: islandAppearance.grassEdgeWidth,
            alpha: islandAppearance.grassEdgeAlpha,
          });

        container.addChild(grass);
      }

      for (const decoration of island.decorations) {
        const sprite = new PIXI.Sprite(getTexture(decoration.tileId));

        sprite.anchor.set(0.5);
        sprite.position.set(decoration.x, decoration.y);

        container.addChild(sprite);
      }
    }

    return layer;
  } catch (error) {
    layer.destroy({ children: true });
    throw error;
  }
}

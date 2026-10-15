import * as PIXI from 'pixi.js';
import {
  islandConfig,
  type IslandDefinition,
  type IslandPoint,
} from './islands';
import { createRoundedOutline } from './islandGeometry';

const tileImageUrls = import.meta.glob<string>(
  '../../assets/png/default/tiles/*.png',
  { eager: true, query: '?url', import: 'default' },
);

const islandAppearance = {
  shallowWaterColor: 0x8fe1da,
  outerShallowsWidth: 48,
  outerShallowsAlpha: 0.12,
  innerShallowsWidth: 25,
  innerShallowsAlpha: 0.2,
  sandEdgeColor: 0xd8b87c,
  sandEdgeWidth: 4,
  sandEdgeAlpha: 0.4,
  sandDetailAlpha: 0.16,
  sandDetailScale: 1.7,
  shorelineColor: 0xfff2ce,
  shorelineWidth: 3,
  shorelineAlpha: 0.5,
  grassColor: 0x709640,
  grassTextureAlpha: 0.24,
  grassEdgeColor: 0x507532,
  grassEdgeWidth: 3,
  grassEdgeAlpha: 0.35,
};

export async function createIslandLayer(
  islands: readonly IslandDefinition[],
): Promise<PIXI.Container> {
  // Load only textures used by this map, rather than the complete tile collection.
  const requiredIds = new Set([
    islandConfig.sandTextureId,
    islandConfig.sandDetailTextureId,
    islandConfig.grassTextureId,
    ...islands.flatMap((island) =>
      island.decorations.map((item) => item.tileId),
    ),
  ]);
  const entries = await Promise.all(
    [...requiredIds].map(async (tileId) => {
      const url =
        tileImageUrls[`../../assets/png/default/tiles/tile_${tileId}.png`];
      if (!url) throw new Error(`Missing island tile: ${tileId}`);
      return [tileId, await PIXI.Assets.load<PIXI.Texture>(url)] as const;
    }),
  );
  const textures = new Map(entries);
  const layer = new PIXI.Container();
  layer.eventMode = 'none';

  function getTexture(tileId: number): PIXI.Texture {
    const texture = textures.get(tileId);
    if (!texture) throw new Error(`Missing tile texture: ${tileId}`);
    return texture;
  }

  function addShallows(
    container: PIXI.Container,
    outline: IslandPoint[],
  ): void {
    // These translucent strokes are decorative; solid land alone defines collision.
    container.addChild(
      new PIXI.Graphics()
        .poly(outline)
        .stroke({
          color: islandAppearance.shallowWaterColor,
          width: islandAppearance.outerShallowsWidth,
          alpha: islandAppearance.outerShallowsAlpha,
        })
        .poly(outline)
        .stroke({
          color: islandAppearance.shallowWaterColor,
          width: islandAppearance.innerShallowsWidth,
          alpha: islandAppearance.innerShallowsAlpha,
        }),
    );
  }

  try {
    for (const island of islands) {
      const container = new PIXI.Container();
      container.position.set(island.x, island.y);
      layer.addChild(container);
      const outline = createRoundedOutline(island.outline, island.cornerRadius);
      addShallows(container, outline);

      container.addChild(
        new PIXI.Graphics()
          .poly(outline)
          .fill({
            texture: getTexture(islandConfig.sandTextureId),
            textureSpace: 'global',
          })
          .stroke({
            color: islandAppearance.sandEdgeColor,
            width: islandAppearance.sandEdgeWidth,
            alpha: islandAppearance.sandEdgeAlpha,
          }),
      );
      container.addChild(
        new PIXI.Graphics()
          .poly(outline)
          .fill({
            texture: getTexture(islandConfig.sandDetailTextureId),
            textureSpace: 'global',
            matrix: new PIXI.Matrix().scale(
              islandAppearance.sandDetailScale,
              islandAppearance.sandDetailScale,
            ),
            alpha: islandAppearance.sandDetailAlpha,
          })
          .stroke({
            color: islandAppearance.shorelineColor,
            width: islandAppearance.shorelineWidth,
            alpha: islandAppearance.shorelineAlpha,
          }),
      );

      if (island.grassOutline.length > 0) {
        const grassOutline = createRoundedOutline(
          island.grassOutline,
          island.cornerRadius,
        );
        // A stable base color and stretched, faint texture suppress the old checkerboard.
        container.addChild(
          new PIXI.Graphics()
            .poly(grassOutline)
            .fill(islandAppearance.grassColor)
            .poly(grassOutline)
            .fill({
              texture: getTexture(islandConfig.grassTextureId),
              textureSpace: 'local',
              alpha: islandAppearance.grassTextureAlpha,
            })
            .stroke({
              color: islandAppearance.grassEdgeColor,
              width: islandAppearance.grassEdgeWidth,
              alpha: islandAppearance.grassEdgeAlpha,
            }),
        );
      }

      // Sorting within the decoration layer keeps southern props in front of northern ones.
      for (const decoration of [...island.decorations].sort(
        (a, b) => a.y - b.y,
      )) {
        const sprite = new PIXI.Sprite(getTexture(decoration.tileId));
        sprite.anchor.set(0.5);
        sprite.position.set(decoration.x, decoration.y);
        sprite.scale.set(decoration.scale ?? 1);
        sprite.rotation = decoration.rotation ?? 0;
        container.addChild(sprite);
      }
    }
    return layer;
  } catch (error) {
    layer.destroy({ children: true });
    throw error;
  }
}

import * as PIXI from 'pixi.js';
import {
  islandConfig,
  type IslandDefinition,
  type IslandPoint,
} from './islands';
import { createRoundedOutline } from './islandGeometry';

const tileImageUrls = import.meta.glob<string>(
  '../../assets/png/default/tiles/*.png',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);

const islandAppearance = {
  shallowWaterColor: 0x8fe1da,
  outerShallowsPadding: 24,
  outerShallowsAlpha: 0.12,
  innerShallowsPadding: 12,
  innerShallowsAlpha: 0.2,
  shorelineColor: 0xfff2ce,
  shorelineInset: 2,
  sandDetailAlpha: 0.16,
  sandDetailScale: 1.7,
  grassColor: 0x709640,
  grassTextureAlpha: 0.24,
  grassEdgeColor: 0x507532,
  grassEdgeInset: 1.5,
  cacheResolution: 1,
};

// Expand/inset the silhouette around its bounds center without stroke tessellation.
// These cosmetic layers never change the solid-land collision polygon.
function padOutline(
  points: readonly IslandPoint[],
  padding: number,
): IslandPoint[] {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const centerX = (minX + maxX) / 2,
    centerY = (minY + maxY) / 2;
  const scaleX = Math.max(0, (maxX - minX + padding * 2) / (maxX - minX));
  const scaleY = Math.max(0, (maxY - minY + padding * 2) / (maxY - minY));
  return points.map((point) => ({
    x: centerX + (point.x - centerX) * scaleX,
    y: centerY + (point.y - centerY) * scaleY,
  }));
}

export async function createIslandLayer(
  islands: readonly IslandDefinition[],
): Promise<PIXI.Container> {
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
  function shape(
    container: PIXI.Container,
    outline: IslandPoint[],
  ): PIXI.Graphics {
    const graphic = new PIXI.Graphics();
    // Static terrain stays out of the changing ship/effect graphics batch.
    graphic.context.batchMode = 'no-batch';
    container.addChild(graphic);
    return graphic.poly(outline);
  }
  try {
    for (const island of islands) {
      const container = new PIXI.Container();
      container.position.set(island.x, island.y);
      layer.addChild(container);
      const outline = createRoundedOutline(island.outline, island.cornerRadius);
      shape(
        container,
        padOutline(outline, islandAppearance.outerShallowsPadding),
      ).fill({
        color: islandAppearance.shallowWaterColor,
        alpha: islandAppearance.outerShallowsAlpha,
      });
      shape(
        container,
        padOutline(outline, islandAppearance.innerShallowsPadding),
      ).fill({
        color: islandAppearance.shallowWaterColor,
        alpha: islandAppearance.innerShallowsAlpha,
      });
      shape(container, outline).fill(islandAppearance.shorelineColor);
      const sandOutline = padOutline(outline, -islandAppearance.shorelineInset);
      shape(container, sandOutline).fill({
        texture: getTexture(islandConfig.sandTextureId),
        textureSpace: 'global',
      });
      shape(container, sandOutline).fill({
        texture: getTexture(islandConfig.sandDetailTextureId),
        textureSpace: 'global',
        matrix: new PIXI.Matrix().scale(
          islandAppearance.sandDetailScale,
          islandAppearance.sandDetailScale,
        ),
        alpha: islandAppearance.sandDetailAlpha,
      });
      if (island.grassOutline.length > 0) {
        const edge = createRoundedOutline(
          island.grassOutline,
          island.cornerRadius,
        );
        const grass = padOutline(edge, -islandAppearance.grassEdgeInset);
        shape(container, edge).fill(islandAppearance.grassEdgeColor);
        shape(container, grass).fill(islandAppearance.grassColor);
        shape(container, grass).fill({
          texture: getTexture(islandConfig.grassTextureId),
          textureSpace: 'local',
          alpha: islandAppearance.grassTextureAlpha,
        });
      }
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
      // Each island is static. Pixi owns and releases its cached render texture.
      container.cacheAsTexture({
        resolution: islandAppearance.cacheResolution,
        antialias: true,
      });
    }
    return layer;
  } catch (error) {
    layer.destroy({ children: true });
    throw error;
  }
}

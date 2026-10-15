interface Point {
  x: number;
  y: number;
}
interface Size {
  width: number;
  height: number;
}
export const cameraConfig = {
  visibleWorldHeight: 900,
  minimumScale: 0.45,
  maximumScale: 1.25,
};
function axisOffset(
  viewSize: number,
  worldSize: number,
  target: number,
  scale: number,
): number {
  const scaledSize = worldSize * scale;
  if (scaledSize <= viewSize) return (viewSize - scaledSize) / 2;
  return Math.max(
    viewSize - scaledSize,
    Math.min(0, viewSize / 2 - target * scale),
  );
}
/** Keep ships readable, follow the player and clamp the camera at world boundaries. */
export function getCameraTransform(viewport: Size, arena: Size, player: Point) {
  const scale = Math.max(
    cameraConfig.minimumScale,
    Math.min(
      cameraConfig.maximumScale,
      viewport.height / cameraConfig.visibleWorldHeight,
    ),
  );
  return {
    scale,
    x: axisOffset(viewport.width, arena.width, player.x, scale),
    y: axisOffset(viewport.height, arena.height, player.y, scale),
  };
}

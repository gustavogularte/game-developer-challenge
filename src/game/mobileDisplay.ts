type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>;
};
let ownsFullscreen = false;
let ownsOrientation = false;
export async function enterMobileLandscape(): Promise<void> {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  try {
    if (
      !document.fullscreenElement &&
      document.documentElement.requestFullscreen
    ) {
      await document.documentElement.requestFullscreen();
      ownsFullscreen = true;
    }
  } catch {
    /* CSS provides a landscape layout when fullscreen is unavailable. */
  }
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    if (orientation?.lock) {
      await orientation.lock('landscape');
      ownsOrientation = true;
    }
  } catch {
    /* Orientation locking is browser-dependent; use the CSS fallback. */
  }
}
export function leaveMobileLandscape(): void {
  if (ownsOrientation) {
    screen.orientation?.unlock();
    ownsOrientation = false;
  }
  if (ownsFullscreen && document.fullscreenElement === document.documentElement)
    void document.exitFullscreen().catch(() => {});
  ownsFullscreen = false;
}

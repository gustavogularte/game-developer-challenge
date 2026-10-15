export interface GameSettings {
  durationSeconds: number;
  spawnIntervalSeconds: number;
}
export const settingsConfig = {
  durations: [60, 120, 180] as readonly number[],
  minimumSpawnSeconds: 1,
  maximumSpawnSeconds: 10,
};
export const defaultSettings: GameSettings = {
  durationSeconds: 120,
  spawnIntervalSeconds: 3,
};
export const settingsStorageKey = "pirate-battle:settings:v1";
export function isGameSettings(value: unknown): value is GameSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GameSettings>;
  return (
    settingsConfig.durations.includes(candidate.durationSeconds ?? 0) &&
    Number.isInteger(candidate.spawnIntervalSeconds) &&
    (candidate.spawnIntervalSeconds ?? 0) >=
      settingsConfig.minimumSpawnSeconds &&
    (candidate.spawnIntervalSeconds ?? 0) <= settingsConfig.maximumSpawnSeconds
  );
}
export function loadSettings(): GameSettings {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(settingsStorageKey) ?? "null",
    );
    if (isGameSettings(value)) return value;
  } catch {
    /* Unavailable or invalid storage falls back to defaults. */
  }
  return { ...defaultSettings };
}
export function saveSettings(settings: GameSettings): boolean {
  if (!isGameSettings(settings)) return false;
  try {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

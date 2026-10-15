import type { MatchRecord } from "./contracts";
export const storageKeys = {
  pending: "pirate-battle:pending:v2",
  confirmed: "pirate-battle:confirmed:v2",
  lastResult: "pirate-battle:last-result:v2",
  scenario: "pirate-battle:scenario:v2",
};
export function readStored<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}
export function getPending(): MatchRecord[] {
  const value = readStored<MatchRecord[]>(storageKeys.pending, []);
  return Array.isArray(value) ? value : [];
}
export function queueMatch(record: MatchRecord): void {
  const pending = getPending();
  if (!pending.some((item) => item.id === record.id))
    writeStored(storageKeys.pending, [...pending, record]);
  writeStored(storageKeys.lastResult, record);
}
export function acknowledgeMatch(id: string): void {
  writeStored(
    storageKeys.pending,
    getPending().filter((item) => item.id !== id),
  );
}

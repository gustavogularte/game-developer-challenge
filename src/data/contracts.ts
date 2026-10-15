import type { GameSettings } from '../game/settings';
import type { MatchResult } from '../game/match';
export const currentPlayer = { id: 'local-captain', name: 'Captain Jack' };
export const rulesVersion = 'pirate-battle-v2';
export interface MatchRecord extends MatchResult {
  id: string;
  playerId: string;
  playerName: string;
  completedAt: string;
  settings: GameSettings;
  rulesVersion: string;
}
export interface MatchPage {
  items: MatchRecord[];
  total: number;
  page: number;
  pageSize: number;
}
export const pageSize = 5;
export function settingsKey(settings: GameSettings): string {
  return `${rulesVersion}:${settings.durationSeconds}:${settings.spawnIntervalSeconds}`;
}

import axios from 'axios';
import type { GameSettings } from '../game/settings';
import {
  currentPlayer,
  pageSize,
  rulesVersion,
  type MatchPage,
  type MatchRecord,
} from './contracts';
const http = axios.create({ baseURL: '/api', timeout: 4000 });
export async function getMatches(
  tab: 'ranking' | 'history',
  page: number,
  settings: GameSettings,
  signal?: AbortSignal,
): Promise<MatchPage> {
  const { data } = await http.get<MatchPage>(`/${tab}`, {
    signal,
    params: {
      page,
      pageSize,
      playerId: currentPlayer.id,
      ...settings,
      rulesVersion,
    },
  });
  if (!data || !Array.isArray(data.items) || !Number.isFinite(data.total))
    throw new Error('Invalid battle list response');
  return data;
}
export async function registerMatch(record: MatchRecord): Promise<MatchRecord> {
  const { data } = await http.post<MatchRecord>('/matches', record, {
    headers: { 'Idempotency-Key': record.id },
  });
  if (!data || data.id !== record.id)
    throw new Error('Invalid registration response');
  return data;
}

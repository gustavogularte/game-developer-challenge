import { http, HttpResponse, delay } from 'msw';
import { setupWorker } from 'msw/browser';
import { isGameSettings, type GameSettings } from '../game/settings';
import { currentPlayer, rulesVersion, type MatchRecord } from './contracts';
import { readStored, writeStored, storageKeys } from './storage';
export const networkScenarios = [
  'success',
  'empty',
  'slow',
  'variable',
  'timeout',
  'offline',
  'http400',
  'http500',
  'rankingError',
  'historyError',
  'timeoutAfterCommit',
  'registrationOffline',
] as const;
export type NetworkScenario = (typeof networkScenarios)[number];
let requestNumber = 0;
const timedOutIds = new Set<string>();
/** Failure simulation is opt-in per URL; old persisted failures never affect normal play. */
export function getScenario(): NetworkScenario {
  const requested = new URLSearchParams(window.location.search).get('network');
  return (
    networkScenarios.find((scenario) => scenario === requested) ?? 'success'
  );
}
export function setScenario(value: NetworkScenario): void {
  const url = new URL(window.location.href);
  if (value === 'success') url.searchParams.delete('network');
  else url.searchParams.set('network', value);
  window.history.replaceState(null, '', url);
  requestNumber = 0;
}
export function resetMockData(): void {
  writeStored(storageKeys.confirmed, []);
  writeStored(storageKeys.pending, []);
  localStorage.removeItem(storageKeys.lastResult);
  timedOutIds.clear();
  setScenario('success');
}
function confirmed(): MatchRecord[] {
  const value = readStored<MatchRecord[]>(storageKeys.confirmed, []);
  return Array.isArray(value) ? value : [];
}
function fixtures(settings: GameSettings): MatchRecord[] {
  const names = [
    'Captain Flint',
    'Red Sparrow',
    'Storm Rider',
    'Sea Wolf',
    'Anne Bonny',
    'Black Sails',
    'Silver Hook',
    'Mary Read',
    'Calico Jack',
    'Ocean Ghost',
    'Captain Kidd',
    'Iron Compass',
    'Pearl Hunter',
    'Blue Tide',
    'Sea Raven',
  ];
  return names.map((name, index) => ({
    id: `fixture-${settings.durationSeconds}-${settings.spawnIntervalSeconds}-${index}`,
    playerId: `fixture-${index}`,
    playerName: name,
    completedAt: new Date(Date.UTC(2026, 8, 8, 21, 42 - index)).toISOString(),
    score: 38 - index * 2,
    playedSeconds: settings.durationSeconds,
    reason: 'timeUp',
    settings: { ...settings },
    rulesVersion,
  }));
}
async function simulate(
  resource: 'ranking' | 'history' | 'matches',
): Promise<Response | undefined> {
  const scenario = getScenario();
  requestNumber += 1;
  await delay(
    scenario === 'slow'
      ? 2500
      : scenario === 'variable'
        ? requestNumber % 2
          ? 1800
          : 100
        : 120,
  );
  if (scenario === 'timeout') {
    await delay(6000);
    return HttpResponse.error();
  }
  if (
    scenario === 'offline' ||
    (scenario === 'registrationOffline' && resource === 'matches')
  )
    return HttpResponse.error();
  if (scenario === 'http400')
    return HttpResponse.json(
      { message: 'Simulated invalid request' },
      { status: 400 },
    );
  if (scenario === 'http500' || scenario === `${resource}Error`)
    return HttpResponse.json(
      { message: 'Simulated service unavailable' },
      { status: 503 },
    );
}
function validRecord(value: unknown): value is MatchRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<MatchRecord>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    r.playerId === currentPlayer.id &&
    typeof r.playerName === 'string' &&
    typeof r.completedAt === 'string' &&
    Number.isFinite(Date.parse(r.completedAt)) &&
    Number.isInteger(r.score) &&
    r.score! >= 0 &&
    Number.isFinite(r.playedSeconds) &&
    r.playedSeconds! >= 0 &&
    isGameSettings(r.settings) &&
    r.playedSeconds! <= r.settings.durationSeconds &&
    (r.reason === 'timeUp' || r.reason === 'playerDefeated') &&
    r.rulesVersion === rulesVersion
  );
}
export const handlers = [
  http.post('/api/matches', async ({ request }) => {
    const failure = await simulate('matches');
    if (failure) return failure;
    const value: unknown = await request.json();
    if (
      !validRecord(value) ||
      request.headers.get('Idempotency-Key') !== value.id
    )
      return HttpResponse.json({ message: 'Invalid match' }, { status: 400 });
    const records = confirmed();
    const existing = records.find((record) => record.id === value.id);
    if (existing) return HttpResponse.json(existing);
    try {
      writeStored(storageKeys.confirmed, [...records, value]);
    } catch {
      return HttpResponse.json(
        { message: 'Storage unavailable' },
        { status: 507 },
      );
    }
    if (getScenario() === 'timeoutAfterCommit' && !timedOutIds.has(value.id)) {
      timedOutIds.add(value.id);
      await delay(6000);
    }
    return HttpResponse.json(value, { status: 201 });
  }),
  ...(['ranking', 'history'] as const).map((resource) =>
    http.get(`/api/${resource}`, async ({ request }) => {
      const failure = await simulate(resource);
      if (failure) return failure;
      const params = new URL(request.url).searchParams;
      const settings = {
        durationSeconds: Number(params.get('durationSeconds')),
        spawnIntervalSeconds: Number(params.get('spawnIntervalSeconds')),
      };
      if (!isGameSettings(settings))
        return HttpResponse.json(
          { message: 'Invalid settings' },
          { status: 400 },
        );
      const page = Math.max(1, Number(params.get('page')) || 1);
      const size = Math.min(
        50,
        Math.max(1, Number(params.get('pageSize')) || 5),
      );
      let records = getScenario() === 'empty' ? [] : confirmed();
      if (resource === 'ranking') {
        if (getScenario() !== 'empty')
          records = [...fixtures(settings), ...records];
        records = records.filter(
          (r) =>
            r.settings.durationSeconds === settings.durationSeconds &&
            r.settings.spawnIntervalSeconds === settings.spawnIntervalSeconds &&
            r.rulesVersion === params.get('rulesVersion'),
        );
        records.sort(
          (a, b) =>
            b.score - a.score ||
            a.completedAt.localeCompare(b.completedAt) ||
            a.id.localeCompare(b.id),
        );
      } else {
        records = records.filter((r) => r.playerId === params.get('playerId'));
        records.sort(
          (a, b) =>
            b.completedAt.localeCompare(a.completedAt) ||
            a.id.localeCompare(b.id),
        );
      }
      return HttpResponse.json({
        items: records.slice((page - 1) * size, page * size),
        total: records.length,
        page,
        pageSize: size,
      });
    }),
  ),
];
export const worker = setupWorker(...handlers);

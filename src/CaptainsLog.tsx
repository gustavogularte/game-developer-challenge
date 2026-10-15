import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMatches } from './data/api';
import { currentPlayer, pageSize, settingsKey } from './data/contracts';
import { useMatchSync } from './data/MatchSync';
import {
  getScenario,
  networkScenarios,
  resetMockData,
  setScenario,
  type NetworkScenario,
} from './data/mocks';
import type { GameSettings } from './game/settings';
export type LogTab = 'ranking' | 'history';
export function CaptainsLog({
  initialTab,
  settings,
  onBack,
}: {
  initialTab: LogTab;
  settings: GameSettings;
  onBack: () => void;
}) {
  const [tab, setTab] = React.useState(initialTab);
  const [page, setPage] = React.useState(1);
  const [scenario, updateScenario] = React.useState(getScenario);
  const queryClient = useQueryClient();
  const sync = useMatchSync();
  const query = useQuery({
    queryKey: ['matches', tab, settingsKey(settings), page, scenario],
    queryFn: ({ signal }) => getMatches(tab, page, settings, signal),
    retry: 1,
    refetchOnMount: 'always',
  });
  const totalPages = Math.max(
    1,
    Math.ceil((query.data?.total ?? 0) / pageSize),
  );
  function changeTab(next: LogTab) {
    setTab(next);
    setPage(1);
  }
  function changeScenario(next: NetworkScenario) {
    setScenario(next);
    updateScenario(next);
    if (next === 'success') sync.retry();
    setPage(1);
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
  }
  return (
    <main className="menu-background">
      <section className="framed-panel captain-log">
        <h1>CAPTAIN’S LOG</h1>
        <div className="log-tabs" aria-label="Battle records">
          <button
            className={tab === 'ranking' ? 'gold-button' : 'secondary-button'}
            aria-pressed={tab === 'ranking'}
            onClick={() => changeTab('ranking')}
          >
            RANKING
          </button>
          <button
            className={tab === 'history' ? 'gold-button' : 'secondary-button'}
            aria-pressed={tab === 'history'}
            onClick={() => changeTab('history')}
          >
            MATCH HISTORY
          </button>
        </div>
        <p className="subtle">
          {tab === 'ranking'
            ? `${settings.durationSeconds} SECOND BATTLES · ${settings.spawnIntervalSeconds} SECOND SPAWN INTERVAL`
            : 'CAPTAIN JACK · YOUR RECENT BATTLES'}
        </p>
        {sync.pending.length > 0 && (
          <div className="registration-status" role="status">
            {sync.pending.length} battle(s) saved locally.{' '}
            {sync.syncing ? 'Syncing…' : 'Ready to sync.'}{' '}
            <button
              className="text-button"
              disabled={sync.syncing}
              onClick={sync.retry}
            >
              RETRY
            </button>
            {sync.error && <p>{sync.error}</p>}
          </div>
        )}
        {query.isPending ? (
          <p role="status">Loading battles…</p>
        ) : query.isError ? (
          <div role="alert">
            <p>Could not load battles. You can still play.</p>
            <button
              className="gold-button"
              onClick={() => void query.refetch()}
            >
              TRY AGAIN
            </button>
          </div>
        ) : (
          <>
            {query.isFetching && (
              <p className="subtle" role="status">
                Updating…
              </p>
            )}
            <div className="table-scroll">
              <table>
                <caption className="visually-hidden">
                  {tab === 'ranking' ? 'Ranking' : 'Your match history'}
                </caption>
                <thead>
                  <tr>
                    {(tab === 'ranking'
                      ? ['RANK', 'CAPTAIN', 'POINTS', 'PLAYED']
                      : ['DATE', 'POINTS', 'DURATION', 'RESULT']
                    ).map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((record, index) => (
                    <tr
                      key={record.id}
                      className={
                        record.playerId === currentPlayer.id ? 'own-record' : ''
                      }
                    >
                      {tab === 'ranking' ? (
                        <>
                          <td>
                            {String((page - 1) * pageSize + index + 1).padStart(
                              2,
                              '0',
                            )}
                          </td>
                          <td>
                            {record.playerName}{' '}
                            {record.playerId === currentPlayer.id && (
                              <small>YOU</small>
                            )}
                          </td>
                          <td className="points">{record.score}</td>
                          <td>{formatDate(record.completedAt)}</td>
                        </>
                      ) : (
                        <>
                          <td>{formatDate(record.completedAt)}</td>
                          <td className="points">{record.score}</td>
                          <td>{formatDuration(record.playedSeconds)}</td>
                          <td
                            className={
                              record.reason === 'timeUp'
                                ? 'result-survived'
                                : 'result-defeated'
                            }
                          >
                            {record.reason === 'timeUp'
                              ? 'TIME UP'
                              : 'DEFEATED'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {query.data.items.length === 0 && <p>No battles yet.</p>}
            <nav className="pagination" aria-label="Results pages">
              <button
                className="round-button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                ‹
              </button>
              <span>
                PAGE {page} OF {totalPages}
              </span>
              <button
                className="round-button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                ›
              </button>
            </nav>
          </>
        )}
        <button
          className="gold-button"
          data-ui-sound="uiClose"
          onClick={onBack}
        >
          MAIN MENU
        </button>
        <details className="network-demo">
          <summary>Network demo</summary>
          <label>
            Scenario{' '}
            <select
              value={scenario}
              onChange={(event) =>
                changeScenario(event.target.value as NetworkScenario)
              }
            >
              {networkScenarios.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              if (
                window.confirm('Reset mock battles and pending registrations?')
              ) {
                resetMockData();
                window.location.reload();
              }
            }}
          >
            RESET DEMO DATA
          </button>
        </details>
      </section>
    </main>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
function formatDuration(value: number) {
  const seconds = Math.floor(value);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

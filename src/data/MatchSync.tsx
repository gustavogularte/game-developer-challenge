import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerMatch } from './api';
import { acknowledgeMatch, getPending, queueMatch } from './storage';
import type { MatchRecord } from './contracts';

interface SyncContextValue {
  pending: MatchRecord[];
  syncing: boolean;
  error: string | null;
  submit: (record: MatchRecord) => void;
  retry: () => void;
}
const SyncContext = React.createContext<SyncContextValue | null>(null);
export function useMatchSync() {
  const context = React.useContext(SyncContext);
  if (!context) throw new Error('MatchSyncProvider is missing');
  return context;
}
export function MatchSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState(getPending);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const running = React.useRef(false);
  const transient = React.useRef(new Map<string, MatchRecord>());
  const mutation = useMutation({
    mutationFn: registerMatch,
    retry: 1,
    retryDelay: 500,
  });
  const mutateAsync = mutation.mutateAsync;
  const retry = React.useCallback(() => {
    if (running.current) return;
    running.current = true;
    setSyncing(true);
    setError(null);
    void (async () => {
      const attempted = new Set<string>();
      let confirmedAny = false;
      try {
        // Re-read after each request: a new battle may finish while this queue is draining.
        while (true) {
          const records = new Map(
            [...getPending(), ...transient.current.values()].map((record) => [
              record.id,
              record,
            ]),
          );
          const record = [...records.values()].find(
            (item) => !attempted.has(item.id),
          );
          if (!record) break;
          attempted.add(record.id);
          try {
            await mutateAsync(record);
            acknowledgeMatch(record.id);
            transient.current.delete(record.id);
            confirmedAny = true;
          } catch {
            setError(
              'Could not sync some battles. Check your connection and try again.',
            );
          }
          setPending([
            ...new Map(
              [...getPending(), ...transient.current.values()].map((item) => [
                item.id,
                item,
              ]),
            ).values(),
          ]);
        }
      } catch {
        setError('Could not read saved battles. Please try syncing again.');
      } finally {
        running.current = false;
        setSyncing(false);
        if (confirmedAny)
          void queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    })();
  }, [mutateAsync, queryClient]);
  React.useEffect(() => {
    retry();
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [retry]);
  const submit = React.useCallback(
    (record: MatchRecord) => {
      try {
        queueMatch(record);
      } catch {
        transient.current.set(record.id, record);
        setError(
          'Browser storage unavailable. Keep this tab open until the battle is synced.',
        );
      }
      setPending([
        ...new Map(
          [...getPending(), ...transient.current.values()].map((item) => [
            item.id,
            item,
          ]),
        ).values(),
      ]);
      retry();
    },
    [retry],
  );
  return (
    <SyncContext.Provider value={{ pending, syncing, error, submit, retry }}>
      {children}
    </SyncContext.Provider>
  );
}

export function RegistrationStatus({ id }: { id: string }) {
  const sync = useMatchSync();
  const pending = sync.pending.some((record) => record.id === id);
  // The result shows a compact state. Recovery controls belong to Match History.
  return (
    <p className="registration-status" role="status">
      {!pending
        ? 'Battle saved'
        : sync.syncing
          ? 'Saving battle…'
          : 'Saved locally · sync available in Match History'}
    </p>
  );
}

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerMatch } from "./api";
import { acknowledgeMatch, getPending, queueMatch } from "./storage";
import type { MatchRecord } from "./contracts";
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
  if (!context) throw new Error("MatchSyncProvider is missing");
  return context;
}
export function MatchSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState(getPending);
  const [error, setError] = React.useState<string | null>(null);
  const running = React.useRef(false);
  const transient = React.useRef<MatchRecord[]>([]);
  const mutation = useMutation({
    mutationFn: registerMatch,
    retry: 1,
    retryDelay: 500,
  });
  const mutateAsync = mutation.mutateAsync;
  const retry = React.useCallback(() => {
    if (running.current) return;
    running.current = true;
    setError(null);
    void (async () => {
      try {
        const records = new Map(
          [...getPending(), ...transient.current].map((record) => [
            record.id,
            record,
          ]),
        );
        for (const record of records.values()) {
          await mutateAsync(record);
          acknowledgeMatch(record.id);
          transient.current = transient.current.filter(
            (item) => item.id !== record.id,
          );
          setPending([...getPending(), ...transient.current]);
          await queryClient.invalidateQueries({ queryKey: ["matches"] });
        }
      } catch {
        setError("Registration pending. Your battle is safe to retry.");
      } finally {
        running.current = false;
      }
    })();
  }, [mutateAsync, queryClient]);
  React.useEffect(() => {
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [retry]);
  const submit = React.useCallback(
    (record: MatchRecord) => {
      try {
        queueMatch(record);
        setPending(getPending());
      } catch {
        transient.current.push(record);
        setPending([...getPending(), ...transient.current]);
        setError(
          "Browser storage unavailable. Keep this tab open until registration succeeds.",
        );
      }
      retry();
    },
    [retry],
  );
  return (
    <SyncContext.Provider
      value={{ pending, syncing: mutation.isPending, error, submit, retry }}
    >
      {children}
    </SyncContext.Provider>
  );
}
export function RegistrationStatus({ id }: { id: string }) {
  const sync = useMatchSync();
  const pending = sync.pending.some((record) => record.id === id);
  return (
    <div className="registration-status" role="status">
      {pending
        ? sync.syncing
          ? "Registering battle…"
          : "Registration pending"
        : "Battle registered"}
      {pending && !sync.syncing && (
        <button className="text-button" onClick={sync.retry}>
          RETRY
        </button>
      )}
      {pending && sync.error && <p>{sync.error}</p>}
    </div>
  );
}

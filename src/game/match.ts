export type MatchEndReason = 'timeUp' | 'playerDefeated';

export interface MatchResult {
  score: number;
  playedSeconds: number;
  reason: MatchEndReason;
}

export interface MatchState {
  status: 'playing' | 'finished';
  durationSeconds: number;
  elapsedSeconds: number;
  result: MatchResult | null;
}

export const matchConfig = {
  durationSeconds: 120,
  minimumDurationSeconds: 60,
  maximumDurationSeconds: 180,
};

export function createMatchState(
  durationSeconds = matchConfig.durationSeconds,
): MatchState {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < matchConfig.minimumDurationSeconds ||
    durationSeconds > matchConfig.maximumDurationSeconds
  ) {
    throw new RangeError('Match duration must be between 60 and 180 seconds.');
  }

  return {
    status: 'playing',
    durationSeconds,
    elapsedSeconds: 0,
    result: null,
  };
}

export function getRemainingSeconds(match: MatchState): number {
  return Math.max(0, Math.ceil(match.durationSeconds - match.elapsedSeconds));
}

export function advanceMatch(
  match: MatchState,
  deltaSeconds: number,
  playerHealth: number,
  score: number,
): void {
  if (match.status !== 'playing') return;

  match.elapsedSeconds = Math.min(
    match.durationSeconds,
    match.elapsedSeconds + Math.max(0, deltaSeconds),
  );

  const playerDefeated = playerHealth <= 0;
  const timeExpired = match.elapsedSeconds >= match.durationSeconds;

  if (!playerDefeated && !timeExpired) return;

  match.status = 'finished';

  match.result = {
    score,
    playedSeconds: match.elapsedSeconds,
    reason: playerDefeated ? 'playerDefeated' : 'timeUp',
  };
}

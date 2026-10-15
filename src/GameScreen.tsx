import * as React from 'react';
import { GameCanvas, type GameControls } from './GameCanvas';
import { GameHud } from './GameHud';
import { MatchResultDialog } from './MatchResultDialog';
import { TouchControls } from './TouchControls';
import { PauseDialog } from './PauseDialog';
import type { MatchResult } from './game/match';
import type { GameSettings } from './game/settings';
import {
  currentPlayer,
  rulesVersion,
  type MatchRecord,
} from './data/contracts';
import { RegistrationStatus, useMatchSync } from './data/MatchSync';
interface Props {
  onMainMenu: () => void;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
}
export function GameScreen({ onMainMenu, settings, onSettingsChange }: Props) {
  const [snapshot, setSnapshot] = React.useState(() => ({ ...settings }));
  const [score, setScore] = React.useState(0);
  const [health, setHealth] = React.useState(100);
  const [remainingSeconds, setRemainingSeconds] = React.useState(
    snapshot.durationSeconds,
  );
  const [result, setResult] = React.useState<MatchRecord | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [boostSeconds, setBoostSeconds] = React.useState(0);
  const [matchNumber, setMatchNumber] = React.useState(0);
  const controls = React.useMemo<GameControls>(() => ({}), []);
  const matchId = React.useRef(crypto.randomUUID());
  const recorded = React.useRef(false);
  const { submit } = useMatchSync();
  const finishMatch = React.useCallback(
    (finished: MatchResult) => {
      if (recorded.current) return;
      recorded.current = true;
      const record: MatchRecord = {
        ...finished,
        id: matchId.current,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        completedAt: new Date().toISOString(),
        settings: { ...snapshot },
        rulesVersion,
      };
      submit(record);
      setResult(record);
    },
    [snapshot, submit],
  );
  function restartMatch() {
    setResult(null);
    setPaused(false);
    setScore(0);
    setHealth(100);
    setBoostSeconds(0);
    setSnapshot({ ...settings });
    setRemainingSeconds(settings.durationSeconds);
    matchId.current = crypto.randomUUID();
    recorded.current = false;
    setMatchNumber((value) => value + 1);
  }
  return (
    <div>
      <GameCanvas
        key={matchNumber}
        settings={snapshot}
        controls={controls}
        onPauseChange={setPaused}
        onBoostChange={setBoostSeconds}
        onScoreChange={setScore}
        onHealthChange={setHealth}
        onTimeChange={setRemainingSeconds}
        onMatchEnd={finishMatch}
      />
      <GameHud
        health={health}
        maxHealth={100}
        score={score}
        remainingSeconds={remainingSeconds}
        onPause={() => controls.pause?.()}
        disabled={paused || result !== null}
        boostSeconds={boostSeconds}
      />
      <TouchControls controls={controls} disabled={paused || result !== null} />
      {paused && !result && (
        <PauseDialog
          onResume={() => controls.resume?.()}
          onMainMenu={onMainMenu}
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
      )}
      {result && (
        <MatchResultDialog
          result={result}
          onPlayAgain={restartMatch}
          onMainMenu={onMainMenu}
          registration={<RegistrationStatus id={result.id} />}
        />
      )}
    </div>
  );
}

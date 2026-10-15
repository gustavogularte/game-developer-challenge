import * as React from 'react';
import { GameCanvas } from './GameCanvas';
import { GameHud } from './GameHud';

export function GameScreen() {
  const [score, setScore] = React.useState(0);
  const [health, setHealth] = React.useState(100);

  return (
    <div>
      <GameCanvas onScoreChange={setScore} onHealthChange={setHealth} />

      <GameHud
        health={health}
        maxHealth={100}
        score={score}
        remainingSeconds={120}
      />
    </div>
  );
}
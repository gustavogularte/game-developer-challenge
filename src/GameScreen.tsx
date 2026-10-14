import * as React from 'react';
import { GameCanvas } from './GameCanvas';
import { GameHud } from './GameHud';

export function GameScreen() {
  const [score, setScore] = React.useState(0);

  return (
    <div>
      <GameCanvas onScoreChange={setScore} />

      <GameHud
        health={100}
        maxHealth={100}
        score={score}
        remainingSeconds={120}
      />
    </div>
  );
}
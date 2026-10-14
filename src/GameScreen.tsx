import { GameCanvas } from './GameCanvas';
import { GameHud } from './GameHud';

export function GameScreen() {
  return (
    <div>
      <GameCanvas />
      <GameHud health={100} maxHealth={100} score={0} remainingSeconds={120} />
    </div>
  );
}

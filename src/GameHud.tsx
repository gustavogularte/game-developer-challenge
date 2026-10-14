import './GameHud.css';
import scoreIconUrl from '../assets/png/default/ui/hud/icon_score.png';
import timeIconUrl from '../assets/png/default/ui/hud/icon_time.png';
import heartIconUrl from '../assets/png/default/ui/hud/icon_heart.png';
import healthFillGreenUrl from '../assets/png/default/ui/hud/health_fill_green.png';
import healthFillAmberUrl from '../assets/png/default/ui/hud/health_fill_amber.png';
import healthFillRedUrl from '../assets/png/default/ui/hud/health_fill_red.png';

interface GameHudProps {
  health: number;
  maxHealth: number;
  score: number;
  remainingSeconds: number;
}

export function GameHud({
  health,
  maxHealth,
  score,
  remainingSeconds,
}: GameHudProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const healthRatio =
    maxHealth > 0 ? Math.min(1, Math.max(0, health / maxHealth)) : 0;

  let healthFillImageUrl = healthFillGreenUrl;

  if (healthRatio <= 0.3) {
    healthFillImageUrl = healthFillRedUrl;
  } else if (healthRatio <= 0.6) {
    healthFillImageUrl = healthFillAmberUrl;
  }

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="game-hud">
      <div className="game-hud__health">
        <img className="game-hud__heart" src={heartIconUrl} alt="Health" />

        <div className="game-hud__health-bar">
          <div
            className="game-hud__health-fill"
            style={{
              width: `${196 * healthRatio}px`,
              backgroundImage: `url("${healthFillImageUrl}")`,
            }}
            aria-hidden="true"
          />

          <span className="game-hud__health-text">
            {health} / {maxHealth}
          </span>
        </div>
      </div>

      <div className="game-hud__counters">
        <div className="game-hud__counter">
          <img src={scoreIconUrl} alt="Score" />
          <span>{score}</span>
        </div>

        <div className="game-hud__counter">
          <img src={timeIconUrl} alt="Time remaining" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}

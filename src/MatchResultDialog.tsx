import * as React from "react";
import type { MatchResult } from "./game/match";
import "./MatchResultDialog.css";

interface MatchResultDialogProps {
  result: MatchResult;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  registration?: React.ReactNode;
}

const secondsPerMinute = 60;

export function MatchResultDialog({
  result,
  onPlayAgain,
  onMainMenu,
  registration,
}: MatchResultDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    titleRef.current?.focus();

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const playedSeconds = Math.floor(result.playedSeconds);
  const minutes = Math.floor(playedSeconds / secondsPerMinute);
  const seconds = playedSeconds % secondsPerMinute;

  const formattedTime =
    `${String(minutes).padStart(2, "0")}:` + String(seconds).padStart(2, "0");

  const title = result.reason === "timeUp" ? "BATTLE COMPLETE" : "GAME OVER";

  const reasonLabel = result.reason === "timeUp" ? "TIME UP" : "SHIP DESTROYED";

  return (
    <dialog
      ref={dialogRef}
      className="match-result"
      aria-labelledby="match-result-title"
      aria-describedby="match-result-details"
      onCancel={(event) => event.preventDefault()}
    >
      <section className="match-result__panel">
        <h2 ref={titleRef} tabIndex={-1} id="match-result-title">
          {title}
        </h2>

        <p className="match-result__score">{result.score}</p>

        <p id="match-result-details" className="match-result__details">
          POINTS · {formattedTime} · {reasonLabel}
        </p>

        {registration}
        <div className="match-result__actions">
          <button
            type="button"
            className="match-result__button"
            onClick={onPlayAgain}
          >
            PLAY AGAIN
          </button>

          <button
            type="button"
            className="match-result__button"
            onClick={onMainMenu}
          >
            MAIN MENU
          </button>
        </div>
      </section>
    </dialog>
  );
}

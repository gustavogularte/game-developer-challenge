import './MainMenu.css';
import './MainMenuControls.css';
import titleImageUrl from '../assets/png/default/ui/menu/title_pirate_battle.png';
import pirateShipImageUrl from '../assets/png/default/ships/ship_2.png';

interface MainMenuProps {
  onPlay: () => void;
  onOptions: () => void;
  onRanking: () => void;
  onHistory: () => void;
}

export function MainMenu({
  onPlay,
  onOptions,
  onRanking,
  onHistory,
}: MainMenuProps) {
  return (
    <main className="main-menu">
      <section className="main-menu__panel">
        <h1>
          <img
            src={titleImageUrl}
            alt="Pirate Battle"
            className="main-menu__title"
          />
        </h1>
        <p>SET SAIL. TAKE COMMAND.</p>
        <button
          type="button"
          className="main-menu__button main-menu__button--primary"
          onClick={onPlay}
        >
          PLAY
        </button>
        <button
          type="button"
          className="main-menu__button main-menu__button--primary"
          onClick={onOptions}
          data-ui-sound="uiOpen"
        >
          OPTIONS
        </button>
        <img
          src={pirateShipImageUrl}
          alt="Pirate Ship"
          className="main-menu__ship"
        />
        <p>Navigate the islands. Survive the battle.</p>
        <div className="main-menu__footer-actions">
          <button
            type="button"
            className="main-menu__button main-menu__button--secondary"
            onClick={onRanking}
            data-ui-sound="uiOpen"
          >
            RANKING
          </button>
          <button
            type="button"
            className="main-menu__button main-menu__button--secondary"
            onClick={onHistory}
            data-ui-sound="uiOpen"
          >
            MATCH HISTORY
          </button>
        </div>
        <section className="menu-controls" aria-label="Keyboard controls">
          <h2>CONTROLS</h2>
          <p>
            <kbd>W</kbd> / <kbd>↑</kbd> Forward · <kbd>A</kbd> / <kbd>←</kbd>{' '}
            Left · <kbd>D</kbd> / <kbd>→</kbd> Right
          </p>
          <p>
            <kbd>Space</kbd> Front shot · <kbd>Q</kbd> / <kbd>E</kbd> Side shots
          </p>
          <p>
            <kbd>Esc</kbd> Pause / resume
          </p>
        </section>
      </section>
    </main>
  );
}

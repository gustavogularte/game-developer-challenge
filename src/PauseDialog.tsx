import * as React from 'react';
import { OptionsPanel } from './OptionsPanel';
import type { GameSettings } from './game/settings';
interface Props {
  onResume: () => void;
  onMainMenu: () => void;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
}
export function PauseDialog({
  onResume,
  onMainMenu,
  settings,
  onSettingsChange,
}: Props) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const [options, setOptions] = React.useState(false);
  React.useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    titleRef.current?.focus();
    return () => dialog.close();
  }, []);
  function dismissPause(): void {
    if (options) setOptions(false);
    else onResume();
  }
  return (
    <dialog
      ref={dialogRef}
      className="pirate-dialog"
      aria-label={options ? 'Options' : 'Pause'}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        // Keep the native dialog and simulation pause state in sync.
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) dismissPause();
      }}
      onCancel={(event) => {
        event.preventDefault();
        dismissPause();
      }}
    >
      {options ? (
        <OptionsPanel
          settings={settings}
          onChange={onSettingsChange}
          onBack={() => setOptions(false)}
          inGame
        />
      ) : (
        <section className="pause-content">
          <h1 tabIndex={-1} ref={titleRef}>
            PAUSE
          </h1>
          <p>Ready when you are.</p>
          <button className="gold-button" onClick={onResume}>
            RESUME
          </button>
          <button
            className="gold-button"
            data-ui-sound="uiOpen"
            onClick={() => setOptions(true)}
          >
            OPTIONS
          </button>
          <button
            className="gold-button"
            data-ui-sound="uiClose"
            onClick={onMainMenu}
          >
            MAIN MENU
          </button>
        </section>
      )}
    </dialog>
  );
}

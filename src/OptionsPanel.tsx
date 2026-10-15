import * as React from 'react';
import {
  settingsConfig,
  saveSettings,
  type GameSettings,
} from './game/settings';
import plusUrl from '../assets/png/default/ui/controls/icon_plus.png';
import minusUrl from '../assets/png/default/ui/controls/icon_minus.png';
interface Props {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onBack: () => void;
  inGame?: boolean;
}
export function OptionsPanel({
  settings,
  onChange,
  onBack,
  inGame = false,
}: Props) {
  const [storageError, setStorageError] = React.useState(false);
  function update(next: GameSettings) {
    setStorageError(!saveSettings(next));
    onChange(next);
  }
  const durationIndex = settingsConfig.durations.indexOf(
    settings.durationSeconds,
  );
  const rows = [
    {
      label: 'Game session time',
      value: settings.durationSeconds,
      minimum: durationIndex === 0,
      maximum: durationIndex === settingsConfig.durations.length - 1,
      change: (direction: number) =>
        update({
          ...settings,
          durationSeconds: settingsConfig.durations[durationIndex + direction],
        }),
    },
    {
      label: 'Enemy spawn time',
      value: settings.spawnIntervalSeconds,
      minimum:
        settings.spawnIntervalSeconds === settingsConfig.minimumSpawnSeconds,
      maximum:
        settings.spawnIntervalSeconds === settingsConfig.maximumSpawnSeconds,
      change: (direction: number) =>
        update({
          ...settings,
          spawnIntervalSeconds: settings.spawnIntervalSeconds + direction,
        }),
    },
  ];
  return (
    <section className="options-content">
      <h1>OPTIONS</h1>
      {rows.map((row) => (
        <div className="option" key={row.label}>
          <h2>{row.label}</h2>
          <div className="option__controls">
            <button
              className="round-button"
              aria-label={`Decrease ${row.label}`}
              disabled={row.minimum}
              onClick={() => row.change(-1)}
            >
              <img src={minusUrl} alt="" />
            </button>
            <output aria-live="polite">{row.value} s</output>
            <button
              className="round-button"
              aria-label={`Increase ${row.label}`}
              disabled={row.maximum}
              onClick={() => row.change(1)}
            >
              <img src={plusUrl} alt="" />
            </button>
          </div>
        </div>
      ))}
      <p className="subtle">
        {inGame
          ? 'Changes apply to your next battle.'
          : 'Settings are saved automatically.'}
      </p>
      {storageError && (
        <p role="alert">Could not save settings in this browser.</p>
      )}
      <button className="gold-button" data-ui-sound="uiClose" onClick={onBack}>
        {inGame ? 'BACK TO PAUSE' : 'MAIN MENU'}
      </button>
    </section>
  );
}

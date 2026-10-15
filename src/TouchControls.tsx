import * as React from 'react';
import type { GameControls } from './GameCanvas';
import type { PlayerInput } from './game/input';
const controlsList: {
  action: keyof PlayerInput;
  label: string;
  icon: string;
}[] = [
  { action: 'turnLeft', label: 'Turn left', icon: 'turn_left' },
  { action: 'moveForward', label: 'Move forward', icon: 'forward' },
  { action: 'turnRight', label: 'Turn right', icon: 'turn_right' },
  { action: 'fireLeft', label: 'Fire left', icon: 'fire_left' },
  { action: 'fireFront', label: 'Fire front', icon: 'fire_front' },
  { action: 'fireRight', label: 'Fire right', icon: 'fire_right' },
];
const icons = import.meta.glob<string>(
  '../assets/png/default/ui/controls/icon_*.png',
  { eager: true, query: '?url', import: 'default' },
);
export function TouchControls({
  controls,
  disabled,
}: {
  controls: GameControls;
  disabled: boolean;
}) {
  const pointers = React.useRef(new Map<number, keyof PlayerInput>());
  function release(event: React.PointerEvent<HTMLButtonElement>) {
    const action = pointers.current.get(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (action && ![...pointers.current.values()].includes(action))
      controls.setInput?.(action, false);
  }
  React.useEffect(() => {
    if (disabled) pointers.current.clear();
  }, [disabled]);
  return (
    <div className="touch-controls" aria-label="Ship controls">
      {controlsList.map(({ action, label, icon }) => (
        <button
          key={action}
          className="round-button"
          aria-label={label}
          disabled={disabled}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            pointers.current.set(event.pointerId, action);
            controls.setInput?.(action, true);
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onContextMenu={(event) => event.preventDefault()}
        >
          <img
            src={icons[`../assets/png/default/ui/controls/icon_${icon}.png`]}
            alt=""
          />
        </button>
      ))}
    </div>
  );
}

import * as React from 'react';
import type { GameControls } from './GameCanvas';
import type { PlayerInput } from './game/input';
import { getSteeringOffset } from './game/touchSteering';
const attacks = [
  { action: 'fireLeft', label: 'Fire left', icon: 'fire_left' },
  { action: 'fireFront', label: 'Fire front', icon: 'fire_front' },
  { action: 'fireRight', label: 'Fire right', icon: 'fire_right' },
] as const;
const icons = import.meta.glob<string>(
  '../assets/png/default/ui/controls/icon_*.png',
  { eager: true, query: '?url', import: 'default' },
);
const idleSteering = { x: 0, y: 0, forward: false, left: false, right: false };
export function TouchControls({
  controls,
  disabled,
}: {
  controls: GameControls;
  disabled: boolean;
}) {
  const steeringPointer = React.useRef<number | null>(null);
  const attackPointers = React.useRef(new Map<number, keyof PlayerInput>());
  const [steering, setSteering] = React.useState(idleSteering);
  const [activeAttacks, setActiveAttacks] = React.useState<readonly string[]>(
    [],
  );
  React.useEffect(() => {
    if (disabled) {
      steeringPointer.current = null;
      attackPointers.current.clear();
      setSteering(idleSteering);
      setActiveAttacks([]);
    }
    return () => {
      for (const action of [
        'moveForward',
        'turnLeft',
        'turnRight',
        'fireLeft',
        'fireFront',
        'fireRight',
      ] as const)
        controls.setInput?.(action, false);
    };
  }, [controls, disabled]);
  function steer(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || event.pointerId !== steeringPointer.current) return;
    const offset = getSteeringOffset(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      window.matchMedia('(pointer: coarse) and (orientation: portrait)')
        .matches,
    );
    controls.setInput?.('moveForward', true);
    controls.setInput?.('turnLeft', offset.turnLeft);
    controls.setInput?.('turnRight', offset.turnRight);
    setSteering({
      x: offset.x,
      y: offset.y,
      forward: true,
      left: offset.turnLeft,
      right: offset.turnRight,
    });
  }
  function stopSteering(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerId !== steeringPointer.current) return;
    steeringPointer.current = null;
    controls.setInput?.('moveForward', false);
    controls.setInput?.('turnLeft', false);
    controls.setInput?.('turnRight', false);
    setSteering(idleSteering);
  }
  function releaseAttack(event: React.PointerEvent<HTMLButtonElement>) {
    const action = attackPointers.current.get(event.pointerId);
    attackPointers.current.delete(event.pointerId);
    if (action && ![...attackPointers.current.values()].includes(action))
      controls.setInput?.(action, false);
    setActiveAttacks([...attackPointers.current.values()]);
  }
  return (
    <div className="touch-controls" aria-label="Ship controls">
      <div className="touch-steering">
        <button
          type="button"
          className="touch-steering__pad"
          aria-label="Hold to move, slide left or right to turn"
          aria-describedby="touch-steering-help"
          aria-pressed={steering.forward}
          disabled={disabled}
          data-forward={steering.forward}
          data-left={steering.left}
          data-right={steering.right}
          onPointerDown={(event) => {
            if (steeringPointer.current !== null || disabled) return;
            event.preventDefault();
            steeringPointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            steer(event);
          }}
          onPointerMove={steer}
          onPointerUp={stopSteering}
          onPointerCancel={stopSteering}
          onLostPointerCapture={stopSteering}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="touch-steering__arrows" aria-hidden="true">
            ‹ ↑ ›
          </span>
          <span
            className="touch-steering__thumb"
            style={{ transform: `translate(${steering.x}px, ${steering.y}px)` }}
          >
            <img
              src={icons['../assets/png/default/ui/controls/icon_forward.png']}
              alt=""
            />
          </span>
        </button>
        <span id="touch-steering-help">HOLD TO SAIL · SLIDE TO TURN</span>
      </div>
      <div className="touch-attacks">
        {attacks.map(({ action, label, icon }) => (
          <button
            key={action}
            type="button"
            className="round-button"
            aria-label={label}
            aria-pressed={activeAttacks.includes(action)}
            disabled={disabled}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              attackPointers.current.set(event.pointerId, action);
              controls.setInput?.(action, true);
              setActiveAttacks([...attackPointers.current.values()]);
            }}
            onPointerUp={releaseAttack}
            onPointerCancel={releaseAttack}
            onLostPointerCapture={releaseAttack}
            onContextMenu={(event) => event.preventDefault()}
          >
            <img
              src={icons[`../assets/png/default/ui/controls/icon_${icon}.png`]}
              alt=""
            />
          </button>
        ))}
      </div>
    </div>
  );
}

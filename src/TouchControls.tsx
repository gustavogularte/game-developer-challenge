import './TouchControls.css';
import * as React from 'react';
import type { GameControls } from './GameCanvas';
import type { PlayerInput } from './game/input';
type MoveAction = 'moveForward' | 'turnLeft' | 'turnRight';
interface MovementPointer {
  action: MoveAction;
  forward: boolean;
}
const movementButtons = [
  { action: 'turnLeft', label: 'Turn left', icon: 'turn_left' },
  { action: 'moveForward', label: 'Move forward', icon: 'forward' },
  { action: 'turnRight', label: 'Turn right', icon: 'turn_right' },
] as const;
const attacks = [
  { action: 'fireLeft', label: 'Fire left', icon: 'fire_left' },
  { action: 'fireFront', label: 'Fire front', icon: 'fire_front' },
  { action: 'fireRight', label: 'Fire right', icon: 'fire_right' },
] as const;
const icons = import.meta.glob<string>(
  '../assets/png/default/ui/controls/icon_*.png',
  { eager: true, query: '?url', import: 'default' },
);
const idleMovement = { moveForward: false, turnLeft: false, turnRight: false };
export function TouchControls({
  controls,
  disabled,
}: {
  controls: GameControls;
  disabled: boolean;
}) {
  const groupRef = React.useRef<HTMLDivElement>(null);
  const movementPointers = React.useRef(new Map<number, MovementPointer>());
  const attackPointers = React.useRef(new Map<number, keyof PlayerInput>());
  const [movement, setMovement] = React.useState(idleMovement);
  const [activeAttacks, setActiveAttacks] = React.useState<readonly string[]>(
    [],
  );
  React.useEffect(() => {
    if (disabled) {
      movementPointers.current.clear();
      attackPointers.current.clear();
      setMovement(idleMovement);
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
  function publishMovement() {
    const pointers = [...movementPointers.current.values()];
    const next = {
      moveForward: pointers.some((pointer) => pointer.forward),
      turnLeft: pointers.some((pointer) => pointer.action === 'turnLeft'),
      turnRight: pointers.some((pointer) => pointer.action === 'turnRight'),
    };
    for (const action of Object.keys(next) as MoveAction[])
      controls.setInput?.(action, next[action]);
    setMovement(next);
  }
  function slideMovement(event: React.PointerEvent<HTMLDivElement>) {
    const pointer = movementPointers.current.get(event.pointerId);
    if (!pointer || disabled) return;
    event.preventDefault();
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[data-move-action]',
    );
    if (!buttons) return;
    for (const button of buttons) {
      const rect = button.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        const action = button.dataset.moveAction as MoveAction;
        const forward = pointer.forward || action === 'moveForward';
        if (action !== pointer.action || forward !== pointer.forward) {
          pointer.action = action;
          // Sliding from forward to a turn keeps thrust held until this finger lifts.
          pointer.forward = forward;
          publishMovement();
        }
        break;
      }
    }
  }
  function releaseMovement(event: React.PointerEvent<HTMLDivElement>) {
    if (!movementPointers.current.delete(event.pointerId)) return;
    publishMovement();
  }
  function releaseAttack(event: React.PointerEvent<HTMLButtonElement>) {
    const action = attackPointers.current.get(event.pointerId);
    attackPointers.current.delete(event.pointerId);
    if (action && ![...attackPointers.current.values()].includes(action))
      controls.setInput?.(action, false);
    setActiveAttacks([...attackPointers.current.values()]);
  }
  return (
    <div
      className="touch-controls"
      aria-label="Ship controls"
      data-ui-silent="true"
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        ref={groupRef}
        className="touch-movement"
        aria-label="Movement"
        data-forward={movement.moveForward}
        data-left={movement.turnLeft}
        data-right={movement.turnRight}
        onPointerMove={slideMovement}
        onPointerUp={releaseMovement}
        onPointerCancel={releaseMovement}
        onLostPointerCapture={releaseMovement}
      >
        {movementButtons.map(({ action, label, icon }) => (
          <button
            key={action}
            type="button"
            className="round-button"
            aria-label={label}
            aria-pressed={movement[action]}
            data-move-action={action}
            disabled={disabled}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              movementPointers.current.set(event.pointerId, {
                action,
                forward: action === 'moveForward',
              });
              publishMovement();
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <img
              src={icons[`../assets/png/default/ui/controls/icon_${icon}.png`]}
              draggable={false}
              alt=""
            />
          </button>
        ))}
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
              draggable={false}
              alt=""
            />
          </button>
        ))}
      </div>
    </div>
  );
}

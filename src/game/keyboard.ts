import { createPlayerInput, type PlayerInput } from './input';

const keyBindings: Partial<Record<string, keyof PlayerInput>> = {
  KeyW: 'moveForward',
  ArrowUp: 'moveForward',
  KeyA: 'turnLeft',
  ArrowLeft: 'turnLeft',
  KeyD: 'turnRight',
  ArrowRight: 'turnRight',
  Space: 'fireFront',
  KeyQ: 'fireLeft',
  KeyE: 'fireRight',
};

export function bindKeyboardInput(input: PlayerInput): () => void {
  const pressedKeys = new Set<string>();

  function updateAction(action: keyof PlayerInput) {
    input[action] = Object.keys(keyBindings).some(
      (code) => keyBindings[code] === action && pressedKeys.has(code),
    );
  }

  function handleKeyDown(event: KeyboardEvent) {
    const action = keyBindings[event.code];

    if (!action) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    event.preventDefault();

    pressedKeys.add(event.code);
    updateAction(action);
  }

  function handleKeyUp(event: KeyboardEvent) {
    const action = keyBindings[event.code];

    if (!action) return;

    event.preventDefault();

    pressedKeys.delete(event.code);
    updateAction(action);
  }

  function resetInput() {
    pressedKeys.clear();
    Object.assign(input, createPlayerInput());
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      resetInput();
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', resetInput);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return function unbindKeyboardInput() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', resetInput);
    document.removeEventListener('visibilitychange', handleVisibilityChange);

    resetInput();
  };
}

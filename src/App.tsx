import * as React from 'react';
import { GameCanvas } from './GameCanvas';
import { MainMenu } from './MainMenu';

type Screen = 'menu' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = React.useState<Screen>('menu');

  function startGame() {
    setCurrentScreen('game');
  }

  return currentScreen === 'menu' ? (
    <MainMenu onPlay={startGame} />
  ) : (
    <GameCanvas />
  );
}

export default App;

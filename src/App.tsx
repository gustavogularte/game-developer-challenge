import * as React from 'react';
import { MainMenu } from './MainMenu';
import { GameScreen } from './GameScreen';

type Screen = 'menu' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = React.useState<Screen>('menu');

  function startGame() {
    setCurrentScreen('game');
  }

  return currentScreen === 'menu' ? (
    <MainMenu onPlay={startGame} />
  ) : (
    <GameScreen />
  );
}

export default App;

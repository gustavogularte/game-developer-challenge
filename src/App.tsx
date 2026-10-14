import * as React from 'react';
import { MainMenu } from './MainMenu';
import { GameScreen } from './GameScreen';
import { unlockAudio } from './game/audio';

type Screen = 'menu' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = React.useState<Screen>('menu');

  function startGame() {
    void unlockAudio().catch((error) => {
      console.error('Failed to enable audio:', error);
    });

    setCurrentScreen('game');
  }

  return currentScreen === 'menu' ? (
    <MainMenu onPlay={startGame} />
  ) : (
    <GameScreen />
  );
}

export default App;

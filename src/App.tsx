import * as React from "react";
import { MainMenu } from "./MainMenu";
import { GameScreen } from "./GameScreen";
import { OptionsPanel } from "./OptionsPanel";
import { CaptainsLog } from "./CaptainsLog";
import { MatchResultDialog } from "./MatchResultDialog";
import { RegistrationStatus } from "./data/MatchSync";
import { readStored, storageKeys } from "./data/storage";
import type { MatchRecord } from "./data/contracts";
import { loadSettings } from "./game/settings";
import { playUiSound, unlockAudio, type SoundName } from "./game/audio";
import "./Panels.css";
type Screen = "menu" | "game" | "options" | "ranking" | "history";
function App() {
  const [screen, setScreen] = React.useState<Screen>("menu");
  const [settings, setSettings] = React.useState(loadSettings);
  const [lastResult, setLastResult] = React.useState(() =>
    readStored<MatchRecord | null>(storageKeys.lastResult, null),
  );
  function startGame() {
    void unlockAudio().catch(() => {});
    setLastResult(null);
    setScreen("game");
  }
  function returnToMenu() {
    setLastResult(null);
    setScreen("menu");
  }
  function uiSound(event: React.MouseEvent<HTMLDivElement>) {
    const button = (event.target as HTMLElement).closest("button");
    if (button && !button.disabled)
      playUiSound(
        (button.dataset.uiSound as SoundName | undefined) ?? "uiClick",
      );
  }
  return (
    <div
      onClickCapture={uiSound}
      onPointerOver={(event) => {
        const button = (event.target as HTMLElement).closest("button");
        if (
          button &&
          !button.disabled &&
          !(event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) &&
          navigator.userActivation?.hasBeenActive
        )
          playUiSound("uiHover");
      }}
    >
      {screen === "menu" && (
        <MainMenu
          onPlay={startGame}
          onOptions={() => setScreen("options")}
          onRanking={() => setScreen("ranking")}
          onHistory={() => setScreen("history")}
        />
      )}
      {screen === "game" && (
        <GameScreen
          settings={settings}
          onSettingsChange={setSettings}
          onMainMenu={returnToMenu}
        />
      )}
      {screen === "options" && (
        <main className="menu-background">
          <div className="framed-panel options-panel">
            <OptionsPanel
              settings={settings}
              onChange={setSettings}
              onBack={returnToMenu}
            />
          </div>
        </main>
      )}
      {(screen === "ranking" || screen === "history") && (
        <CaptainsLog
          initialTab={screen}
          settings={settings}
          onBack={returnToMenu}
        />
      )}
      {lastResult && screen === "menu" && (
        <MatchResultDialog
          result={lastResult}
          onPlayAgain={startGame}
          onMainMenu={returnToMenu}
          registration={<RegistrationStatus id={lastResult.id} />}
        />
      )}
    </div>
  );
}
export default App;

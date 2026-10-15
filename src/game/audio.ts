import frontShotUrl from '../../assets/sounds/cannon_fire_1.wav';
import broadsideUrl from '../../assets/sounds/cannon_broadside.wav';
import waterHitUrl from '../../assets/sounds/cannonball_water_hit_1.wav';
import explosionUrl from '../../assets/sounds/ship_explosion_1.wav';
import scoreUrl from '../../assets/sounds/score_point.wav';
import lowHealthUrl from '../../assets/sounds/health_low.wav';
import oceanUrl from '../../assets/sounds/ocean_ambience_loop.wav';
import enemySinkingUrl from '../../assets/sounds/ship_sinking.wav';

const extraSoundUrls = import.meta.glob<string>(
  '../../assets/sounds/{game_*,ui_*}.wav',
  { eager: true, query: '?url', import: 'default' },
);
function soundUrl(name: string): string {
  return extraSoundUrls[`../../assets/sounds/${name}.wav`];
}
const sounds = {
  gameStart: { url: soundUrl('game_start'), volume: 0.45, loop: false },
  gameOver: { url: soundUrl('game_over'), volume: 0.5, loop: false },
  gameComplete: { url: soundUrl('game_complete'), volume: 0.5, loop: false },
  gamePause: { url: soundUrl('game_pause'), volume: 0.35, loop: false },
  gameResume: { url: soundUrl('game_resume'), volume: 0.4, loop: false },
  uiClick: { url: soundUrl('ui_click'), volume: 0.3, loop: false },
  uiClose: { url: soundUrl('ui_close'), volume: 0.3, loop: false },
  uiOpen: { url: soundUrl('ui_open'), volume: 0.3, loop: false },
  uiHover: { url: soundUrl('ui_hover'), volume: 0.18, loop: false },
  frontShot: { url: frontShotUrl, volume: 0.3, loop: false },
  broadside: { url: broadsideUrl, volume: 0.3, loop: false },
  waterHit: { url: waterHitUrl, volume: 0.12, loop: false },
  explosion: { url: explosionUrl, volume: 0.3, loop: false },
  ocean: { url: oceanUrl, volume: 0.13, loop: true },
  score: { url: scoreUrl, volume: 0.9, loop: false },
  lowHealth: { url: lowHealthUrl, volume: 0.4, loop: true },
  enemySinking: { url: enemySinkingUrl, volume: 0.3, loop: false },
};

export type SoundName = keyof typeof sounds;

const decodedBuffers = new Map<SoundName, Promise<AudioBuffer>>();
let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();

  return audioContext;
}

export async function unlockAudio(): Promise<void> {
  await getAudioContext().resume();
}

export async function createGameAudio() {
  const context = getAudioContext();
  const buffers = new Map<SoundName, AudioBuffer>();
  const activeSources = new Set<AudioBufferSourceNode>();
  const loops = new Map<SoundName, AudioBufferSourceNode>();

  let disposed = false;

  const soundNames = Object.keys(sounds) as SoundName[];

  await Promise.all(
    soundNames.map(async (name) => {
      let pending = decodedBuffers.get(name);
      if (!pending) {
        pending = fetch(sounds[name].url)
          .then(async (response) => {
            if (!response.ok) throw new Error(`Failed to load sound: ${name}`);
            return context.decodeAudioData(await response.arrayBuffer());
          })
          .catch((error) => {
            decodedBuffers.delete(name);
            throw error;
          });
        decodedBuffers.set(name, pending);
      }
      buffers.set(name, await pending);
    }),
  );

  function play(name: SoundName): void {
    if (disposed || loops.has(name)) return;

    const buffer = buffers.get(name);

    if (!buffer) return;

    const config = sounds[name];
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = config.loop;
    gain.gain.value = config.volume;

    source.connect(gain);
    gain.connect(context.destination);

    activeSources.add(source);

    if (config.loop) {
      loops.set(name, source);
    }

    source.onended = () => {
      activeSources.delete(source);

      if (loops.get(name) === source) {
        loops.delete(name);
      }

      source.disconnect();
      gain.disconnect();
    };

    source.start();
  }

  function stop(name: SoundName): void {
    const source = loops.get(name);

    if (!source) return;

    loops.delete(name);
    source.stop();
  }

  function destroy(): void {
    disposed = true;

    for (const source of activeSources) {
      source.stop();
    }

    activeSources.clear();
    loops.clear();
    buffers.clear();
  }

  return { play, stop, destroy };
}

let uiAudio: ReturnType<typeof createGameAudio> | undefined;
export function playUiSound(name: SoundName): void {
  void unlockAudio()
    .then(async () => {
      uiAudio ??= createGameAudio().catch((error) => {
        uiAudio = undefined;
        throw error;
      });
      (await uiAudio).play(name);
    })
    .catch(() => {
      /* Audio failure never blocks navigation. */
    });
}

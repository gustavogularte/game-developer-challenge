import frontShotUrl from '../../assets/sounds/cannon_fire_1.wav';
import broadsideUrl from '../../assets/sounds/cannon_broadside.wav';
import waterHitUrl from '../../assets/sounds/cannonball_water_hit_1.wav';
import explosionUrl from '../../assets/sounds/ship_explosion_1.wav';
import scoreUrl from '../../assets/sounds/score_point.wav';
import lowHealthUrl from '../../assets/sounds/health_low.wav';
import oceanUrl from '../../assets/sounds/ocean_ambience_loop.wav';
import enemySinkingUrl from '../../assets/sounds/ship_sinking.wav';

const sounds = {
  frontShot: { url: frontShotUrl, volume: 0.2, loop: false },
  broadside: { url: broadsideUrl, volume: 0.2, loop: false },
  waterHit: { url: waterHitUrl, volume: 0.02, loop: false },
  explosion: { url: explosionUrl, volume: 0.2, loop: false },
  ocean: { url: oceanUrl, volume: 0.03, loop: true },
  score: { url: scoreUrl, volume: 0.8, loop: false },
  lowHealth: { url: lowHealthUrl, volume: 0.3, loop: true },
  enemySinking: { url: enemySinkingUrl, volume: 0.2, loop: false },
};

type SoundName = keyof typeof sounds;

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
      const response = await fetch(sounds[name].url);

      if (!response.ok) {
        throw new Error(`Failed to load sound: ${name}`);
      }

      const data = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(data);

      buffers.set(name, buffer);
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

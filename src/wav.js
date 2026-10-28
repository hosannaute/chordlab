import { composition, validateProject } from "./project.js";
import { AudioEngine } from "./audio.js";
import { GrandPiano } from "./grand-piano.js";
import { eventDuration } from "./studio.js";

export function encodeWav(buffer) {
  const channels = buffer.numberOfChannels,
    frames = buffer.length;
  const result = new Uint8Array(44 + frames * channels * 2),
    view = new DataView(result.buffer);
  const text = (offset, value) =>
    [...value].forEach((char, index) =>
      view.setUint8(offset + index, char.charCodeAt(0)),
    );
  text(0, "RIFF");
  view.setUint32(4, result.length - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, result.length - 44, true);
  const data = Array.from({ length: channels }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  let offset = 44;
  for (let frame = 0; frame < frames; frame++)
    for (let channel = 0; channel < channels; channel++) {
      const value = Math.max(-1, Math.min(1, data[channel][frame]));
      view.setInt16(
        offset,
        Math.round(value * (value < 0 ? 32768 : 32767)),
        true,
      );
      offset += 2;
    }
  return result;
}
export function wavPlan(project, cycles = 1) {
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 8)
    throw new Error("Choose 1–8 arrangement passes.");
  const song = composition(project),
    beats = song.beats * cycles;
  const seconds = (beats * 60) / project.tempo;
  const count = song.tracks.reduce(
    (sum, track) => sum + Math.ceil(beats / track.beats) * track.events.length,
    0,
  );
  if (!beats) throw new Error("Add chords or melody before exporting audio.");
  if (seconds > 120 || count > 20000)
    throw new Error(
      "WAV export supports up to two minutes and 20,000 notes. Choose fewer passes or shorten the arrangement.",
    );
  return { song, beats, seconds, count };
}
export async function renderWav(
  input,
  {
    cycles = 1,
    bank,
    masterVolume,
    onProgress = () => {},
    OfflineContext = globalThis.OfflineAudioContext ||
      globalThis.webkitOfflineAudioContext,
  } = {},
) {
  const project = validateProject(input),
    plan = wavPlan(project, cycles);
  if (!OfflineContext)
    throw new Error("Offline audio export is unavailable in this browser.");
  const context = new OfflineContext(
    2,
    Math.ceil(
      (plan.seconds + Math.max(0.8, project.piano.release) + 0.1) * 44100,
    ),
    44100,
  );
  const audio = new AudioEngine({ offline: true });
  audio.context = context;
  audio.instrument = project.instrument;
  audio.piano = project.piano;
  audio.master = context.createGain();
  audio.master.gain.value = masterVolume ?? project.masterVolume;
  const limiter = context.createDynamicsCompressor();
  Object.assign(limiter.threshold, { value: -12 });
  Object.assign(limiter.knee, { value: 12 });
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  audio.master.connect(limiter).connect(context.destination);
  audio.setMix(project.mix);
  if (project.instrument === "grand-piano") {
    onProgress("Loading piano recordings…");
    audio.grandPiano = bank?.isReady(project.piano.layers)
      ? bank
      : new GrandPiano(context);
    await audio.grandPiano.load(project.piano.layers);
  }
  const events = [];
  for (const track of plan.song.tracks)
    for (let offset = 0; offset < plan.beats; offset += track.beats)
      for (const event of track.events) {
        const start = offset + event.start;
        if (start < plan.beats)
          events.push({
            ...event,
            start,
            duration: Math.min(eventDuration(track, event), plan.beats - start),
          });
      }
  events.sort((a, b) => a.start - b.start);
  onProgress("Rendering the arrangement…");
  for (const event of events)
    audio.note(
      event.pitch,
      (event.start * 60) / project.tempo,
      (event.duration * 60) / project.tempo,
      "transport",
      { track: event.track, velocity: event.velocity },
    );
  const buffer = await context.startRendering();
  onProgress("Preparing WAV download…");
  return encodeWav(buffer);
}

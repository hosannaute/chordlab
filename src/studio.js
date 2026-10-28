import { barBeats } from "./timing.js";

export const defaultStudio = () => ({
  masterVolume: 0.65,
  mix: {
    chords: { volume: 0.8, mute: false, solo: false },
    melody: { volume: 1, mute: false, solo: false },
  },
  pedal: { chords: [], melody: [] },
  piano: { layers: false, release: 0.35, velocity: 96 },
  metronome: { enabled: false, countIn: 1 },
});
export function validateStudio(project) {
  const defaults = defaultStudio(),
    result = {};
  const finite = (value, min, max) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max;
  for (const field of Object.keys(defaults))
    result[field] = structuredClone(
      project[field] === undefined ? defaults[field] : project[field],
    );
  for (const part of ["chords", "melody"]) {
    const mix = result.mix?.[part],
      pedal = result.pedal?.[part];
    if (
      !mix ||
      !finite(mix.volume, 0, 1) ||
      typeof mix.mute !== "boolean" ||
      typeof mix.solo !== "boolean"
    )
      throw new Error("Invalid track mixer settings.");
    if (
      !Array.isArray(pedal) ||
      pedal.length > 1024 ||
      pedal.some((value) => typeof value !== "boolean")
    )
      throw new Error("Invalid pedal pattern.");
    result.mix[part] = { volume: mix.volume, mute: mix.mute, solo: mix.solo };
  }
  const piano = result.piano,
    metronome = result.metronome;
  if (!finite(result.masterVolume, 0, 1))
    throw new Error("Invalid master volume.");
  if (
    !piano ||
    typeof piano.layers !== "boolean" ||
    !finite(piano.release, 0.05, 2) ||
    !Number.isInteger(piano.velocity) ||
    !finite(piano.velocity, 1, 127)
  )
    throw new Error("Invalid piano dynamics settings.");
  if (
    !metronome ||
    typeof metronome.enabled !== "boolean" ||
    ![0, 1, 2].includes(metronome.countIn)
  )
    throw new Error("Invalid metronome settings.");
  result.mix = { chords: result.mix.chords, melody: result.mix.melody };
  result.pedal = { chords: result.pedal.chords, melody: result.pedal.melody };
  result.piano = {
    layers: piano.layers,
    release: piano.release,
    velocity: piano.velocity,
  };
  result.metronome = { enabled: metronome.enabled, countIn: metronome.countIn };
  return result;
}
export function trackGain(mix, part) {
  if (!mix?.[part]) return 1;
  const anySolo = Object.values(mix).some((track) => track.solo);
  return mix[part].mute || (anySolo && !mix[part].solo) ? 0 : mix[part].volume;
}
export function eventDuration(track, event) {
  const writtenEnd = event.start + event.beats;
  let end = writtenEnd + (track.sustain || 0);
  if (track.bar && track.pedal?.length) {
    let bar = Math.floor(Math.max(0, writtenEnd - 1e-9) / track.bar);
    if (track.pedal[bar]) {
      while (track.pedal[bar + 1] && (bar + 1) * track.bar < track.beats) bar++;
      end = Math.max(end, (bar + 1) * track.bar);
    }
  }
  return Math.max(0, Math.min(end, track.beats) - event.start);
}
export function trackSettings(project, part) {
  return {
    bar: barBeats(project),
    pedal: project.pedal?.[part] || [],
    sustain: project.sustain?.[part] || 0,
  };
}

import { diatonicChord, mod } from "./theory.js";
import {
  DENOMINATORS,
  MIN_STEP,
  NOTE_LENGTHS,
  MAX_BEATS,
  melodyLength,
} from "./timing.js";
export const INSTRUMENTS = [
  "grand-piano",
  "soft-piano",
  "electric-piano",
  "synth-pad",
  "plucked-synth",
  "organ",
];
export const newProject = () => ({
  version: 2,
  id: crypto.randomUUID(),
  name: "Untitled session",
  key: 0,
  mode: "major",
  tempo: 100,
  instrument: "grand-piano",
  meter: { numerator: 4, denominator: 4 },
  melodyBars: 0,
  progression: [0, 4, 5, 3].map((degree) => ({
    degree,
    beats: 4,
    inversion: 0,
    seventh: false,
  })),
  melody: [],
});
const number = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v, min, max) => Number.isInteger(v) && number(v, min, max);
export function validateProject(p) {
  if (
    !p ||
    p.version !== 2 ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.length > 80 ||
    !integer(p.key, 0, 11) ||
    !["major", "minor"].includes(p.mode) ||
    !integer(p.tempo, 40, 220) ||
    !INSTRUMENTS.includes(p.instrument)
  )
    throw new Error("This is not a compatible CHORDLAB project.");
  const meter =
    p.meter === undefined ? { numerator: 4, denominator: 4 } : p.meter;
  if (
    !meter ||
    !integer(meter.numerator, 1, 32) ||
    !DENOMINATORS.includes(meter.denominator)
  )
    throw new Error(
      "Choose a time signature from 1–32 over 1, 2, 4, 8, 16 or 32.",
    );
  const melodyBars = p.melodyBars === undefined ? 0 : p.melodyBars;
  if (
    !integer(
      melodyBars,
      0,
      Math.floor(MAX_BEATS / ((meter.numerator * 4) / meter.denominator)),
    )
  )
    throw new Error("Melody loop length exceeds the timeline.");
  if (
    !Array.isArray(p.progression) ||
    p.progression.length > 128 ||
    !Array.isArray(p.melody) ||
    p.melody.length > 512
  )
    throw new Error("Project exceeds the supported size.");
  const progression = p.progression.map((c) => {
    if (
      !c ||
      !integer(c.degree, 0, 6) ||
      !number(c.beats, MIN_STEP, MAX_BEATS) ||
      (c.beats / MIN_STEP) % 1 ||
      typeof c.seventh !== "boolean" ||
      !integer(c.inversion, 0, c.seventh ? 3 : 2)
    )
      throw new Error("Invalid chord in project.");
    return {
      degree: c.degree,
      beats: c.beats,
      seventh: c.seventh,
      inversion: c.inversion,
    };
  });
  const melody = p.melody.map((n) => {
    if (
      !n ||
      !integer(n.pitch, 36, 95) ||
      !number(n.start, 0, MAX_BEATS - MIN_STEP) ||
      (n.start / MIN_STEP) % 1 ||
      !NOTE_LENGTHS.includes(n.beats) ||
      n.start + n.beats > 128
    )
      throw new Error("Invalid melody note in project.");
    return { pitch: n.pitch, start: n.start, beats: n.beats };
  });
  const phrase = melodyLength({ meter, melodyBars, melody });
  if (phrase > MAX_BEATS || melody.some((n) => n.start + n.beats > phrase))
    throw new Error("The melody loop must contain every melody note.");
  const id =
    typeof p.id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(p.id)
      ? p.id
      : crypto.randomUUID();
  return {
    version: 2,
    id,
    name: p.name.trim(),
    key: p.key,
    mode: p.mode,
    tempo: p.tempo,
    instrument: p.instrument,
    meter: { numerator: meter.numerator, denominator: meter.denominator },
    melodyBars,
    progression,
    melody,
  };
}
export function migrateLegacy(old) {
  if (
    !old ||
    !Array.isArray(old.sequence) ||
    old.sequence.length > 128 ||
    !old.sequence.every((d) => integer(d, 0, 6))
  )
    throw new Error("Invalid legacy progression.");
  return validateProject({
    ...newProject(),
    id: "legacy-recovered",
    name: "Recovered progression",
    key: Number(old.key),
    mode: old.mode,
    tempo: Number(old.tempo),
    instrument:
      {
        sine: "soft-piano",
        triangle: "electric-piano",
        sawtooth: "plucked-synth",
      }[old.wave] || "soft-piano",
    progression: old.sequence.map((degree) => ({
      degree,
      beats: 4,
      inversion: 0,
      seventh: false,
    })),
  });
}
export function transposeProject(project, key) {
  let distance = mod(key - project.key + 6) - 6;
  const melody = project.melody.map((n) => ({
    ...n,
    pitch: n.pitch + distance,
  }));
  if (melody.some((n) => n.pitch < 36 || n.pitch > 95))
    throw new Error(
      "Transposition would move a melody note outside the supported range.",
    );
  return { ...project, key, melody };
}
export function composition(project, part = "all") {
  const events = [];
  let cursor = 0;
  project.progression.forEach((c, index) => {
    if (part !== "melody")
      diatonicChord(
        project.key,
        project.mode,
        c.degree,
        c.seventh,
        c.inversion,
      ).notes.forEach((pitch) =>
        events.push({
          pitch,
          start: cursor,
          beats: c.beats,
          track: "chords",
          index,
        }),
      );
    cursor += c.beats;
  });
  if (part !== "chords")
    project.melody.forEach((n) => events.push({ ...n, track: "melody" }));
  const tracks = [
    {
      name: "chords",
      beats: cursor,
      events: events.filter((e) => e.track === "chords"),
    },
    {
      name: "melody",
      beats: melodyLength(project),
      events: events.filter((e) => e.track === "melody"),
    },
  ].filter((t) => t.events.length && t.beats);
  tracks.forEach((track) => track.events.sort((a, b) => a.start - b.start));
  return {
    events: events.sort((a, b) => a.start - b.start),
    beats: Math.max(0, ...tracks.map((t) => t.beats)),
    tracks,
  };
}

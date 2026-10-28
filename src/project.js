import { INTERVALS, resolveChord, mod } from "./theory.js";
import { defaultStudio, validateStudio, trackSettings } from "./studio.js";
import {
  DENOMINATORS,
  MIN_STEP,
  MAX_BEATS,
  melodyLength,
  validNoteLength,
  barBeats,
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
  melodyBars: 1,
  sustain: { chords: 0, melody: 0 },
  ...defaultStudio(),
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
  const studio = validateStudio(p);
  const velocity = (value) => value === undefined || integer(value, 1, 127);
  const sustain =
    p.sustain === undefined ? { chords: 0, melody: 0 } : p.sustain;
  if (
    !sustain ||
    ![0, 0.5, 1, 2].includes(sustain.chords) ||
    ![0, 0.5, 1, 2].includes(sustain.melody)
  )
    throw new Error("Invalid chord or melody sustain setting.");
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
    if (c?.type === "custom") {
      if (
        !integer(c.root, 0, 11) ||
        !Object.hasOwn(INTERVALS, c.quality) ||
        !integer(c.inversion, 0, INTERVALS[c.quality].length - 1) ||
        !number(c.beats, MIN_STEP, MAX_BEATS) ||
        (c.beats / MIN_STEP) % 1 ||
        !velocity(c.velocity)
      )
        throw new Error("Invalid custom chord in project.");
      const valid = {
        type: "custom",
        root: c.root,
        quality: c.quality,
        beats: c.beats,
        inversion: c.inversion,
        ...(c.velocity === undefined ? {} : { velocity: c.velocity }),
      };
      if (c.sourceKey !== undefined || c.sourceMode !== undefined) {
        if (
          !integer(c.sourceKey, 0, 11) ||
          !["major", "minor"].includes(c.sourceMode)
        )
          throw new Error("Invalid borrowed-chord source.");
        valid.sourceKey = c.sourceKey;
        valid.sourceMode = c.sourceMode;
      }
      return valid;
    }
    if (
      !c ||
      (c.type !== undefined && c.type !== "diatonic") ||
      !integer(c.degree, 0, 6) ||
      !number(c.beats, MIN_STEP, MAX_BEATS) ||
      (c.beats / MIN_STEP) % 1 ||
      typeof c.seventh !== "boolean" ||
      !integer(c.inversion, 0, c.seventh ? 3 : 2) ||
      !velocity(c.velocity)
    )
      throw new Error("Invalid chord in project.");
    return {
      degree: c.degree,
      beats: c.beats,
      seventh: c.seventh,
      inversion: c.inversion,
      ...(c.velocity === undefined ? {} : { velocity: c.velocity }),
    };
  });
  const melody = p.melody.map((n) => {
    if (
      !n ||
      !integer(n.pitch, 36, 95) ||
      !number(n.start, 0, MAX_BEATS - MIN_STEP) ||
      (n.start / MIN_STEP) % 1 ||
      !validNoteLength(n.beats) ||
      n.start + n.beats > 128 ||
      !velocity(n.velocity)
    )
      throw new Error("Invalid melody note in project.");
    return {
      pitch: n.pitch,
      start: n.start,
      beats: n.beats,
      ...(n.velocity === undefined ? {} : { velocity: n.velocity }),
    };
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
    sustain: { chords: sustain.chords, melody: sustain.melody },
    ...studio,
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
  const progression = project.progression.map((chord) =>
    chord.type === "custom"
      ? {
          ...chord,
          root: mod(chord.root + distance),
          ...(Number.isInteger(chord.sourceKey)
            ? { sourceKey: mod(chord.sourceKey + distance) }
            : {}),
        }
      : { ...chord },
  );
  return { ...project, key, melody, progression };
}
export function changeProjectMeter(project, meter) {
  // Validate the meter before using it in timing arithmetic.
  validateProject({ ...project, meter, melodyBars: 0, melody: [] });
  const ratio = barBeats({ meter }) / barBeats(project);
  const snap = (value) => Math.round(value / MIN_STEP) * MIN_STEP;
  const melody = project.melody.map((note) => ({
    ...note,
    start: snap(note.start * ratio),
    beats: Math.max(MIN_STEP, snap(note.beats * ratio)),
  }));
  if (
    melody.some((note, index) =>
      melody.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          note.pitch === other.pitch &&
          note.start < other.start + other.beats &&
          note.start + note.beats > other.start,
      ),
    )
  )
    throw new Error(
      "This meter is too short to keep these notes distinct. Choose a larger meter or move the overlapping notes first.",
    );
  return validateProject({ ...project, meter, melody });
}
export function composition(project, part = "all") {
  const events = [];
  let cursor = 0;
  project.progression.forEach((c, index) => {
    if (part !== "melody")
      resolveChord(project, c).notes.forEach((pitch) =>
        events.push({
          pitch,
          start: cursor,
          beats: c.beats,
          track: "chords",
          index,
          velocity: c.velocity ?? 78,
        }),
      );
    cursor += c.beats;
  });
  if (part !== "chords")
    project.melody.forEach((n) =>
      events.push({ ...n, velocity: n.velocity ?? 96, track: "melody" }),
    );
  const tracks = [
    {
      name: "chords",
      ...trackSettings(project, "chords"),
      beats: cursor,
      events: events.filter((e) => e.track === "chords"),
    },
    {
      name: "melody",
      ...trackSettings(project, "melody"),
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

import { scale } from "./theory.js";
import { MIN_STEP, NOTE_LENGTHS, validNoteLength } from "./timing.js";
import { melodyLength, barBeats, timelineEnd } from "./timing.js";
export { NOTE_LENGTHS } from "./timing.js";
export function resizeLength(beats, lengths = NOTE_LENGTHS) {
  return lengths.reduce((best, value) =>
    Math.abs(value - beats) <= Math.abs(best - beats) ? value : best,
  );
}
export function changeNote(notes, index, patch) {
  if (!notes[index]) throw new Error("Select a melody note first.");
  const note = { ...notes[index], ...patch };
  if (
    !Number.isInteger(note.pitch) ||
    note.pitch < 36 ||
    note.pitch > 95 ||
    !Number.isFinite(note.start) ||
    note.start < 0 ||
    (note.start / MIN_STEP) % 1 ||
    !validNoteLength(note.beats) ||
    note.start + note.beats > 128
  )
    throw new Error(
      "Keep the note inside the timeline and supported pitch range.",
    );
  if (
    notes.some(
      (n, i) =>
        i !== index &&
        n.pitch === note.pitch &&
        n.start < note.start + note.beats &&
        n.start + n.beats > note.start,
    )
  )
    throw new Error("That position overlaps a note of the same pitch.");
  return notes.map((n, i) => (i === index ? note : { ...n }));
}
export function melodyRows(root, mode, octave, scaleOnly, notes = []) {
  const base = (octave + 1) * 12,
    pitches = scale(root, mode);
  return Array.from({ length: Math.min(12, 95 - base) + 1 }, (_, n) => base + n)
    .filter(
      (pitch) =>
        !scaleOnly ||
        pitches.includes(pitch % 12) ||
        notes.some((n) => n.pitch === pitch),
    )
    .reverse();
}
export function repeatPhrase(project) {
  const length = melodyLength(project);
  if (
    !project.melody.length ||
    length * 2 > timelineEnd(project) ||
    project.melody.length * 2 > 512
  )
    throw new Error(
      "The repeated phrase exceeds the timeline or 512-note limit.",
    );
  return {
    ...project,
    melodyBars: (length * 2) / barBeats(project),
    melody: [
      ...project.melody.map((n) => ({ ...n })),
      ...project.melody.map((n) => ({ ...n, start: n.start + length })),
    ],
  };
}

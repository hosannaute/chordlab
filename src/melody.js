import { scale } from "./theory.js";
export const NOTE_LENGTHS = [0.5, 1, 2, 4];
export function resizeLength(beats) {
  return NOTE_LENGTHS.reduce((best, value) =>
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
    (note.start * 2) % 1 ||
    !NOTE_LENGTHS.includes(note.beats) ||
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
export function melodyPage(beat, columns) {
  return Math.min(
    256 / columns - 1,
    Math.max(0, Math.floor((beat * 2) / columns)),
  );
}

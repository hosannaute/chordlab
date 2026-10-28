import { melodyLength, barBeats, MIN_STEP } from "./timing.js";

export class MelodyRecorder {
  constructor(project, step) {
    this.length = melodyLength(project) || barBeats(project);
    this.step = Math.max(MIN_STEP, step);
    this.original = project.melody.map((note) => ({ ...note }));
    this.notes = [];
    this.held = new Map();
  }
  start(id, pitch, beat, velocity = 96) {
    if (
      !Number.isInteger(pitch) ||
      pitch < 36 ||
      pitch > 95 ||
      beat >= this.length ||
      this.held.has(id)
    )
      return;
    this.held.set(id, { pitch, start: beat, velocity });
  }
  end(id, beat) {
    const note = this.held.get(id);
    this.held.delete(id);
    if (!note || beat <= 0 || note.start >= this.length) return;
    const start = Math.min(
      this.length - this.step,
      Math.max(0, Math.round(note.start / this.step) * this.step),
    );
    const end = Math.min(
      this.length,
      Math.max(start + this.step, Math.round(beat / this.step) * this.step),
    );
    this.notes.push({
      pitch: note.pitch,
      start,
      beats: end - start,
      velocity: note.velocity,
    });
  }
  finish(beat = this.length) {
    for (const id of [...this.held.keys()])
      this.end(id, Math.min(beat, this.length));
    const result = this.original.filter(
      (old) =>
        !this.notes.some(
          (note) =>
            note.pitch === old.pitch &&
            note.start < old.start + old.beats &&
            note.start + note.beats > old.start,
        ),
    );
    for (const note of this.notes) {
      // Later strikes replace an overlapping same-pitch strike in this take.
      for (let index = result.length - 1; index >= 0; index--)
        if (
          result[index].pitch === note.pitch &&
          note.start < result[index].start + result[index].beats &&
          note.start + note.beats > result[index].start
        )
          result.splice(index, 1);
      result.push(note);
    }
    if (result.length > 512)
      throw new Error(
        "This take exceeds 512 notes. The original melody was kept.",
      );
    return result.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  }
}

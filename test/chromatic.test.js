import test from "node:test";
import assert from "node:assert/strict";
import { customChord, resolveChord, INTERVALS } from "../src/theory.js";
import {
  newProject,
  validateProject,
  transposeProject,
  composition,
} from "../src/project.js";
import { parseProject, saveProject, readProjects } from "../src/storage.js";
import {
  phraseBarLimit,
  timelineEnd,
  gridLayout,
  melodyLength,
} from "../src/timing.js";
import { repeatPhrase } from "../src/melody.js";

test("custom chords support every root and quality with valid inversions", () => {
  for (let root = 0; root < 12; root++)
    for (const [quality, intervals] of Object.entries(INTERVALS))
      for (let inversion = 0; inversion < intervals.length; inversion++) {
        const chord = customChord(root, quality, inversion);
        assert.equal(chord.notes.length, intervals.length);
        assert.ok(
          chord.notes.every(
            (note, index) => !index || note > chord.notes[index - 1],
          ),
        );
        assert.deepEqual(
          chord.notes.map((n) => (n - root) % 12).sort((a, b) => a - b),
          [...intervals].sort((a, b) => a - b),
        );
      }
  assert.deepEqual(customChord(0, "diminished").notes, [48, 51, 54]);
  assert.deepEqual(customChord(0, "augmented").names, ["C", "E", "G♯"]);
  assert.deepEqual(customChord(0, "dim7").names, ["C", "E♭", "G♭", "B♭♭"]);
});
test("borrowed and custom chords roundtrip and play without changing the home key", () => {
  const p = newProject();
  p.progression.push({
    type: "custom",
    root: 1,
    quality: "minor",
    sourceKey: 9,
    sourceMode: "major",
    beats: 0.5,
    inversion: 1,
  });
  p.progression.push({
    type: "custom",
    root: 0,
    quality: "augmented",
    beats: 1,
    inversion: 0,
  });
  const valid = parseProject(JSON.stringify(p));
  assert.equal(valid.key, 0);
  assert.equal(valid.mode, "major");
  assert.equal(resolveChord(valid, valid.progression[4]).name, "C♯m");
  assert.equal(resolveChord(valid, valid.progression[5]).name, "C+");
  assert.deepEqual(
    composition(valid)
      .events.filter((e) => e.index === 5)
      .map((e) => e.pitch),
    [48, 52, 56],
  );
  const transposed = transposeProject(valid, 2);
  assert.equal(transposed.progression[4].root, 3);
  assert.equal(transposed.progression[4].sourceKey, 11);
  assert.equal(resolveChord(transposed, transposed.progression[4]).name, "D♯m");
  assert.equal(valid.progression[4].root, 1);
});
test("custom chord import rejects unknown qualities, invalid sources and inversions", () => {
  const p = newProject(),
    chord = {
      type: "custom",
      root: 0,
      quality: "diminished",
      beats: 1,
      inversion: 0,
    };
  for (const patch of [
    { root: 12 },
    { quality: "toString" },
    { quality: "mystery" },
    { inversion: 3 },
    { sourceKey: 2 },
    { sourceKey: 20, sourceMode: "major" },
    { beats: 0 },
  ])
    assert.throws(() =>
      validateProject({ ...p, progression: [{ ...chord, ...patch }] }),
    );
  assert.doesNotThrow(() =>
    validateProject({
      ...p,
      progression: [{ ...chord, quality: "dim7", inversion: 3 }],
    }),
  );
});
test("new phrases end at eight musical bars and cannot append a ninth", () => {
  const p = newProject();
  assert.equal(p.melodyBars, 8);
  assert.equal(phraseBarLimit(p), 8);
  assert.equal(timelineEnd(p), 32);
  assert.equal(gridLayout(p, true).pages, 8);
  assert.equal(gridLayout(p, false).pages, 4);
  p.melody = [{ pitch: 60, start: 31.5, beats: 0.5 }];
  assert.equal(melodyLength(p), 32);
  assert.equal(validateProject(p).melody.length, 1);
  assert.throws(() => repeatPhrase(p), /exceeds/);
  p.meter = { numerator: 7, denominator: 8 };
  p.melody = [];
  assert.equal(timelineEnd(p), 28);
  assert.equal(gridLayout(p, true).pages, 8);
});
test("longer legacy phrases remain recoverable instead of losing stored notes", () => {
  const p = {
    ...newProject(),
    melodyBars: 0,
    melody: [{ pitch: 60, start: 40, beats: 1 }],
  };
  const valid = parseProject(JSON.stringify(p));
  assert.deepEqual(valid.melody, p.melody);
  assert.equal(phraseBarLimit(valid), 11);
  assert.equal(timelineEnd(valid), 44);
});
test("saving an earlier project makes it the project restored on reload", () => {
  const map = new Map(),
    storage = {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
    };
  const a = { ...newProject(), name: "A" },
    b = { ...newProject(), name: "B" };
  saveProject(a, storage);
  saveProject(b, storage);
  a.tempo = 120;
  saveProject(a, storage);
  assert.equal(readProjects(storage).at(-1).name, "A");
  assert.equal(readProjects(storage).at(-1).tempo, 120);
  assert.equal(readProjects(storage).length, 2);
});

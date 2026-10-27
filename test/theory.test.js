import test from "node:test";
import assert from "node:assert/strict";
import {
  scale,
  scaleNames,
  diatonicChord,
  buildChord,
  invert,
  transpose,
  mod,
} from "../src/theory.js";
test("all twelve major and natural minor scales preserve interval patterns", () => {
  for (let root = 0; root < 12; root++)
    for (const [mode, pattern] of Object.entries({
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
    }))
      assert.deepEqual(
        scale(root, mode).map((n) => mod(n - root)),
        pattern,
      );
});
test("diatonic qualities and sevenths are correct in every key", () => {
  for (let root = 0; root < 12; root++) {
    assert.deepEqual(
      Array.from(
        { length: 7 },
        (_, d) => diatonicChord(root, "major", d).quality,
      ),
      ["major", "minor", "minor", "major", "major", "minor", "diminished"],
    );
    assert.deepEqual(
      Array.from(
        { length: 7 },
        (_, d) => diatonicChord(root, "minor", d, true).quality,
      ),
      ["min7", "halfdim7", "maj7", "min7", "min7", "maj7", "dom7"],
    );
  }
});
test("contextual spelling uses distinct scale letters", () => {
  assert.deepEqual(scaleNames(5, "major"), [
    "F",
    "G",
    "A",
    "B♭",
    "C",
    "D",
    "E",
  ]);
  assert.deepEqual(scaleNames(6, "major"), [
    "F♯",
    "G♯",
    "A♯",
    "B",
    "C♯",
    "D♯",
    "E♯",
  ]);
  assert.equal(diatonicChord(1, "major", 3).name, "G♭");
  assert.equal(diatonicChord(9, "minor", 4).roman, "v");
  assert.equal(diatonicChord(0, "major", 6, true).roman, "viiø7");
});
test("chords preserve ascending registers across root wrap and inversions", () => {
  assert.deepEqual(diatonicChord(11, "major", 0).notes, [59, 63, 66]);
  assert.deepEqual(buildChord(60, "major", 1), [64, 67, 72]);
  assert.deepEqual(buildChord(60, "dom7", 3), [70, 72, 76, 79]);
  assert.deepEqual(buildChord(60, "augmented"), [60, 64, 68]);
  assert.deepEqual(transpose([60, 64, 67], -2), [58, 62, 65]);
  assert.throws(() => invert([60, 64, 67], 3));
});

import test from "node:test";
import assert from "node:assert/strict";
import { changeNote, melodyRows, resizeLength } from "../src/melody.js";
import { gridLayout } from "../src/timing.js";
test("drag editing respects timeline, pitch, beat snapping and collision boundaries", () => {
  const notes = [
    { pitch: 60, start: 0, beats: 1 },
    { pitch: 60, start: 2, beats: 1 },
  ];
  assert.equal(changeNote(notes, 0, { start: 1 })[0].start, 1);
  for (const patch of [
    { start: 1.5 },
    { start: -0.5 },
    { start: 0.1 },
    { pitch: 96 },
    { start: 127.5, beats: 1 },
  ])
    assert.throws(() => changeNote(notes, 0, patch));
  assert.equal(notes[0].start, 0);
  assert.equal(changeNote(notes, 0, { pitch: 61, start: 2 })[0].pitch, 61);
});
test("resize snaps to supported durations and accepts adjacent notes", () => {
  assert.equal(resizeLength(0.7), 0.5);
  assert.equal(resizeLength(1.6), 2);
  assert.equal(resizeLength(6), 4);
  assert.equal(
    changeNote(
      [
        { pitch: 60, start: 0, beats: 1 },
        { pitch: 60, start: 2, beats: 1 },
      ],
      0,
      { beats: 2 },
    )[0].beats,
    2,
  );
});
test("scale view remains compact and never hides an existing chromatic note within its octave", () => {
  assert.deepEqual(
    melodyRows(0, "major", 4, true),
    [72, 71, 69, 67, 65, 64, 62, 60],
  );
  assert.ok(melodyRows(0, "major", 4, true, [{ pitch: 61 }]).includes(61));
  assert.equal(melodyRows(0, "major", 4, false).length, 13);
  assert.ok(melodyRows(0, "major", 6, false).every((n) => n <= 95));
});
test("responsive page mapping preserves the visible beat and clamps at timeline end", () => {
  const phone = gridLayout({}, true),
    desktop = gridLayout({}, false);
  assert.equal(Math.floor(8 / phone.span), 2);
  assert.equal(Math.floor(8 / desktop.span), 1);
  assert.equal(phone.pages - 1, 7);
});

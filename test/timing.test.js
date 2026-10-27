import test from "node:test";
import assert from "node:assert/strict";
import { newProject, validateProject, composition } from "../src/project.js";
import {
  barBeats,
  melodyLength,
  gridLayout,
  positionLabel,
  DENOMINATORS,
  timelineEnd,
} from "../src/timing.js";
import { repeatPhrase } from "../src/melody.js";

test("custom meters use quarter-note time and bounded pages, including odd and compound meters", () => {
  for (const denominator of DENOMINATORS)
    for (let numerator = 1; numerator <= 32; numerator++) {
      const p = { ...newProject(), meter: { numerator, denominator } };
      assert.equal(barBeats(p), (numerator * 4) / denominator);
      assert.deepEqual(validateProject(p).meter, p.meter);
      for (const compact of [true, false]) {
        const grid = gridLayout(p, compact, 0.5);
        assert.ok(grid.columns <= 32 && grid.columns >= 1);
        assert.ok(Number.isInteger(grid.columns));
        assert.ok(grid.step <= 4 / denominator);
        assert.ok(grid.pages * grid.span >= timelineEnd(p));
        assert.ok(timelineEnd(p) <= 128 && timelineEnd(p) % barBeats(p) === 0);
      }
      assert.equal(positionLabel(barBeats(p), p), "2:1");
    }
});
test("automatic melody loops cover whole bars instead of waiting for longer chords", () => {
  const p = newProject();
  p.meter = { numerator: 7, denominator: 8 };
  p.melody = [{ pitch: 72, start: 0, beats: 0.5 }];
  const song = composition(p);
  assert.equal(song.tracks.find((t) => t.name === "melody").beats, 3.5);
  assert.equal(song.tracks.find((t) => t.name === "chords").beats, 16);
  p.melody.push({ pitch: 74, start: 3.5, beats: 0.5 });
  assert.equal(melodyLength(p), 7);
});
test("explicit melody length preserves rests and refuses to hide existing notes", () => {
  const p = {
    ...newProject(),
    melodyBars: 2,
    melody: [{ pitch: 72, start: 7.5, beats: 0.5 }],
  };
  assert.equal(melodyLength(validateProject(p)), 8);
  assert.throws(
    () => validateProject({ ...p, melodyBars: 1 }),
    /contain every/,
  );
  assert.throws(() => validateProject({ ...p, melodyBars: 33 }), /timeline/);
});
test("old version-2 projects default to 4/4 and automatic phrase length without losing notes", () => {
  const p = newProject();
  delete p.meter;
  delete p.melodyBars;
  p.melody = [{ pitch: 60, start: 2, beats: 1 }];
  const valid = validateProject(p);
  assert.deepEqual(valid.meter, { numerator: 4, denominator: 4 });
  assert.equal(valid.melodyBars, 0);
  assert.deepEqual(valid.melody, p.melody);
  for (const meter of [
    null,
    { numerator: 0, denominator: 4 },
    { numerator: 33, denominator: 4 },
    { numerator: 3, denominator: 3 },
  ])
    assert.throws(() => validateProject({ ...p, meter }));
});
test("more than eight notes and fine subdivisions survive save/import validation", () => {
  const p = newProject();
  p.melody = Array.from({ length: 16 }, (_, n) => ({
    pitch: 60 + (n % 7),
    start: n / 4,
    beats: 0.25,
  }));
  assert.equal(
    validateProject(JSON.parse(JSON.stringify(p))).melody.length,
    16,
  );
  const repeated = repeatPhrase(p);
  assert.equal(repeated.melody.length, 32);
  assert.equal(repeated.melodyBars, 2);
  assert.equal(repeated.melody[16].start, 4);
  repeated.melody[0].pitch = 80;
  assert.equal(p.melody[0].pitch, 60);
  p.melody = Array.from({ length: 512 }, (_, n) => ({
    pitch: 60,
    start: n / 8,
    beats: 0.125,
  }));
  assert.equal(validateProject(p).melody.length, 512);
  assert.throws(() => repeatPhrase(p), /512/);
  p.melody.push({ pitch: 61, start: 0, beats: 1 });
  assert.throws(() => validateProject(p), /size/);
});

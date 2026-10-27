import test from "node:test";
import assert from "node:assert/strict";
import { newProject } from "../src/project.js";
import { exportMidi, vlq } from "../src/midi.js";
function decode(bytes) {
  const view = new DataView(bytes.buffer);
  const tracks = [];
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "MThd");
  assert.equal(view.getUint16(8), 1);
  assert.equal(view.getUint16(12), 480);
  let pos = 14;
  const variable = () => {
    let n = 0,
      b;
    do {
      b = bytes[pos++];
      n = n * 128 + (b & 127);
    } while (b & 128);
    return n;
  };
  while (pos < bytes.length) {
    assert.equal(new TextDecoder().decode(bytes.slice(pos, pos + 4)), "MTrk");
    const end = pos + 8 + view.getUint32(pos + 4);
    pos += 8;
    let tick = 0;
    const events = [];
    while (pos < end) {
      tick += variable();
      const status = bytes[pos++];
      if (status === 255) {
        const type = bytes[pos++],
          length = variable();
        events.push({ tick, type, bytes: [...bytes.slice(pos, pos + length)] });
        pos += length;
      } else {
        const length = (status & 240) === 192 ? 1 : 2;
        events.push({
          tick,
          status,
          bytes: [...bytes.slice(pos, pos + length)],
        });
        pos += length;
      }
    }
    assert.equal(pos, end);
    tracks.push(events);
  }
  assert.equal(tracks.length, view.getUint16(10));
  return tracks;
}
test("VLQ handles boundaries and rejects invalid deltas", () => {
  assert.deepEqual(vlq(0), [0]);
  assert.deepEqual(vlq(128), [129, 0]);
  assert.deepEqual(vlq(16383), [255, 127]);
  assert.throws(() => vlq(-1));
});
test("format-1 MIDI contains exact tempo, chord inversion, duration and melody channel", () => {
  const p = newProject();
  p.melodyBars = 0;
  p.tempo = 120;
  p.meter = { numerator: 2, denominator: 4 };
  p.progression = [{ degree: 0, beats: 2, inversion: 1, seventh: false }];
  p.melody = [{ pitch: 72, start: 0.5, beats: 1 }];
  const tracks = decode(exportMidi(p));
  assert.equal(tracks.length, 3);
  assert.deepEqual(tracks[0].find((e) => e.type === 81).bytes, [7, 161, 32]);
  assert.deepEqual(
    tracks[1].filter((e) => e.status === 144).map((e) => e.bytes[0]),
    [52, 55, 60],
  );
  assert.ok(
    tracks[1].filter((e) => e.status === 128).every((e) => e.tick === 960),
  );
  assert.equal(tracks[2].find((e) => e.status === 145).tick, 240);
  assert.equal(tracks[2].find((e) => e.status === 129).tick, 720);
  assert.ok(tracks.every((t) => t.at(-1).tick === 960 && t.at(-1).type === 47));
});
test("adjacent notes end before retrigger; overlaps merge without early cutoff", () => {
  const p = newProject();
  p.progression = [];
  p.melody = [
    { pitch: 60, start: 0, beats: 2 },
    { pitch: 60, start: 1, beats: 2 },
    { pitch: 60, start: 3, beats: 1 },
  ];
  const track = decode(exportMidi(p))[1];
  assert.equal(track.filter((e) => e.status === 145).length, 2);
  assert.deepEqual(
    track.filter((e) => e.tick === 1440 && e.status).map((e) => e.status),
    [129, 145],
  );
});
test("MIDI exports the selected meter and repeats a short melody across the chord pass", () => {
  for (const [numerator, denominator] of [
    [3, 4],
    [6, 8],
    [7, 8],
    [5, 16],
    [3, 32],
  ]) {
    const p = newProject(),
      bar = (numerator * 4) / denominator;
    p.melodyBars = 0;
    p.meter = { numerator, denominator };
    p.progression = [
      { degree: 0, beats: bar * 4, inversion: 0, seventh: false },
    ];
    p.melody = [{ pitch: 80, start: 0, beats: 0.125 }];
    const tracks = decode(exportMidi(p));
    assert.deepEqual(tracks[0].find((e) => e.type === 88).bytes, [
      numerator,
      Math.log2(denominator),
      24,
      8,
    ]);
    assert.deepEqual(
      tracks[2].filter((e) => e.status === 145).map((e) => e.tick),
      [0, bar * 480, bar * 960, bar * 1440],
    );
    assert.ok(tracks.every((track) => track.at(-1).tick === bar * 4 * 480));
  }
});
test("extreme mismatched phrase lengths cannot allocate an unbounded MIDI arrangement", () => {
  const p = newProject();
  p.meter = { numerator: 1, denominator: 32 };
  p.progression = Array.from({ length: 128 }, () => ({
    degree: 0,
    beats: 128,
    inversion: 0,
    seventh: false,
  }));
  p.melody = Array.from({ length: 512 }, (_, i) => ({
    pitch: 36 + (i % 60),
    start: 0,
    beats: 0.125,
  }));
  assert.throws(() => exportMidi(p), /too large/);
});
test("MIDI includes borrowed, diminished and augmented chord notes", () => {
  const p = newProject();
  p.progression = [
    { type: "custom", root: 2, quality: "dim7", beats: 1, inversion: 0 },
    { type: "custom", root: 0, quality: "augmented", beats: 1, inversion: 0 },
    {
      type: "custom",
      root: 4,
      quality: "dom7",
      sourceKey: 9,
      sourceMode: "minor",
      beats: 1,
      inversion: 0,
    },
  ];
  const notes = decode(exportMidi(p))[1].filter((e) => e.status === 144);
  assert.deepEqual(
    notes.filter((e) => e.tick === 0).map((e) => e.bytes[0]),
    [50, 53, 56, 59],
  );
  assert.deepEqual(
    notes.filter((e) => e.tick === 480).map((e) => e.bytes[0]),
    [48, 52, 56],
  );
  assert.deepEqual(
    notes.filter((e) => e.tick === 960).map((e) => e.bytes[0]),
    [52, 56, 59, 62],
  );
});

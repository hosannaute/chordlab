import test from "node:test";
import assert from "node:assert/strict";
import { newProject, validateProject, composition } from "../src/project.js";
import { trackGain, eventDuration } from "../src/studio.js";
import { readDrafts, saveDraft, recoverableDraft } from "../src/recovery.js";
import { MelodyRecorder } from "../src/recorder.js";
import { wavPlan, encodeWav } from "../src/wav.js";
import { Playback } from "../src/playback.js";
import { repeatPhrase } from "../src/melody.js";

const memory = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
};
test("studio fields and per-note velocities roundtrip, default old saves, and reject corrupt input", () => {
  const p = newProject();
  p.mix.chords = { volume: 0.4, mute: false, solo: true };
  p.piano = { layers: true, release: 0.8, velocity: 48 };
  p.pedal = { chords: [true, false, true], melody: [true] };
  p.progression[0].velocity = 32;
  p.melody = [{ pitch: 60, start: 0, beats: 0.5, velocity: 127 }];
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))), p);
  const old = { ...p };
  for (const field of ["mix", "pedal", "piano", "metronome"]) delete old[field];
  assert.deepEqual(validateProject(old).mix, newProject().mix);
  assert.equal(
    Object.hasOwn(
      validateProject({ ...p, mix: { ...p.mix, unused: null } }).mix,
      "unused",
    ),
    false,
  );
  for (const patch of [
    { mix: null },
    { piano: { ...p.piano, velocity: 0 } },
    { piano: { ...p.piano, layers: "yes" } },
    { pedal: { chords: [1], melody: [] } },
    { metronome: { enabled: true, countIn: 8 } },
    { melody: [{ ...p.melody[0], velocity: 128 }] },
  ])
    assert.throws(() => validateProject({ ...p, ...patch }));
});
test("mute and solo rules preserve volume balance and never override mute", () => {
  const mix = newProject().mix;
  assert.equal(trackGain(mix, "chords"), 0.8);
  mix.melody.solo = true;
  assert.equal(trackGain(mix, "chords"), 0);
  assert.equal(trackGain(mix, "melody"), 1);
  mix.chords.solo = true;
  mix.melody.mute = true;
  assert.equal(trackGain(mix, "chords"), 0.8);
  assert.equal(trackGain(mix, "melody"), 0);
});
test("bar pedal holds notes through contiguous down bars and clears at pedal-up or the phrase edge", () => {
  const track = { bar: 4, beats: 12, sustain: 0, pedal: [true, true, false] };
  assert.equal(eventDuration(track, { start: 0, beats: 0.5 }), 8);
  assert.equal(eventDuration(track, { start: 8, beats: 0.5 }), 0.5);
  assert.equal(
    eventDuration(
      { ...track, pedal: [true, true, true] },
      { start: 0, beats: 1 },
    ),
    12,
  );
  assert.equal(
    eventDuration(
      { ...track, pedal: [], sustain: 2 },
      { start: 11.5, beats: 0.5 },
    ),
    0.5,
  );
  const p = newProject();
  p.pedal.melody = [true];
  p.melody = [{ pitch: 60, start: 0, beats: 0.5 }];
  assert.equal(eventDuration(composition(p).tracks[1], p.melody[0]), 4);
  const repeated = repeatPhrase(p);
  assert.deepEqual(repeated.pedal.melody, [true, true]);
  assert.equal(
    eventDuration(composition(repeated).tracks[1], repeated.melody[0]),
    8,
  );
  assert.deepEqual(p.pedal.melody, [true]);
});
test("recovery keeps manual saves separate, caps history, and does not revive an older dirty draft after a clean save", () => {
  const storage = memory(),
    p = newProject(),
    original = JSON.stringify(p);
  p.tempo = 120;
  saveDraft(p, original, storage, 1);
  assert.equal(recoverableDraft(readDrafts(storage)).project.tempo, 120);
  assert.equal(JSON.parse(original).tempo, 100);
  const b = newProject();
  saveDraft(b, JSON.stringify(b), storage, 2);
  assert.equal(recoverableDraft(readDrafts(storage)), null);
  for (let index = 0; index < 22; index++)
    saveDraft(newProject(), null, storage, index + 3);
  assert.equal(readDrafts(storage).length, 20);
  const corrupt = memory();
  corrupt.data.set("chordlab-drafts-v1", "broken");
  assert.throws(() => saveDraft(p, null, corrupt));
  assert.equal(corrupt.data.get("chordlab-drafts-v1"), "broken");
});
test("recording snaps notes, ignores count-in releases, clips held notes, and preserves the previous melody", () => {
  const p = newProject();
  p.melody = [
    { pitch: 60, start: 0, beats: 1 },
    { pitch: 65, start: 2, beats: 1 },
  ];
  const recorder = new MelodyRecorder(p, 0.5);
  recorder.start("count", 61, -2, 80);
  recorder.end("count", -1);
  recorder.start("replace", 60, 0.12, 48);
  recorder.end("replace", 0.8);
  recorder.start("held", 72, 3.6, 127);
  recorder.start("outside", 96, 1, 96);
  const result = recorder.finish(4);
  assert.deepEqual(result, [
    { pitch: 60, start: 0, beats: 1, velocity: 48 },
    { pitch: 65, start: 2, beats: 1 },
    { pitch: 72, start: 3.5, beats: 0.5, velocity: 127 },
  ]);
  assert.deepEqual(p.melody, [
    { pitch: 60, start: 0, beats: 1 },
    { pitch: 65, start: 2, beats: 1 },
  ]);
  assert.doesNotThrow(() => validateProject({ ...p, melody: result }));
});
test("WAV bounds are checked before audio allocation and PCM encoding writes interleaved signed stereo", () => {
  const p = newProject();
  p.tempo = 120;
  assert.equal(wavPlan(p, 2).seconds, 16);
  assert.throws(() => wavPlan(p, 9), /1–8/);
  p.progression = Array.from({ length: 128 }, () => ({
    degree: 0,
    beats: 128,
    inversion: 0,
    seventh: false,
  }));
  assert.throws(() => wavPlan(p), /two minutes/);
  const wav = encodeWav({
    numberOfChannels: 2,
    length: 3,
    sampleRate: 44100,
    getChannelData: (channel) =>
      new Float32Array(channel ? [0.5, -0.5, 0] : [1, -1, 2]),
  });
  const view = new DataView(wav.buffer);
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), "RIFF");
  assert.equal(view.getUint32(4, true), wav.length - 8);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 44100);
  assert.deepEqual(
    Array.from({ length: 6 }, (_, index) =>
      view.getInt16(44 + index * 2, true),
    ),
    [32767, 16384, -32768, -16384, 32767, 0],
  );
});
test("tempo changes cancel and reschedule the queued 80ms-early note and retime an active hold", async () => {
  for (const tempo of [60, 220]) {
    const calls = [],
      voices = [];
    const audio = {
      context: { currentTime: 0 },
      init: async () => {},
      stop() {},
      note(...args) {
        const voice = {
          args,
          releases: [],
          retimed: [],
          release(...value) {
            this.releases.push(value);
          },
          retime(time) {
            this.retimed.push(time);
          },
        };
        calls.push(args);
        voices.push(voice);
        return voice;
      },
    };
    const p = newProject();
    p.tempo = 120;
    p.progression = [];
    p.melody = [
      { pitch: 72, start: 0, beats: 0.5 },
      { pitch: 74, start: 0.5, beats: 0.5 },
    ];
    const playback = new Playback(audio, () => {});
    await playback.play(p);
    clearInterval(playback.timer);
    audio.context.currentTime = 0.2;
    playback.tick();
    assert.ok(Math.abs(calls[1][1] - 0.29) < 1e-9);
    audio.context.currentTime = 0.21;
    playback.setTempo(tempo);
    assert.deepEqual(voices[1].releases, [[0.21, true]]);
    const expected = 0.21 + (0.16 * 60) / tempo;
    audio.context.currentTime = Math.max(0.21, expected - 0.1);
    playback.tick();
    assert.ok(Math.abs(calls.at(-1)[1] - expected) < 1e-9);
    assert.ok(Math.abs(voices[0].retimed[0] - expected) < 1e-9);
    playback.stop();
  }
});
test("7/8 recording count-in schedules seven clicks before the first note on the same clock", async () => {
  const clicks = [],
    notes = [],
    frames = [];
  const audio = {
    context: { currentTime: 0 },
    init: async () => {},
    stop() {},
    note(...args) {
      notes.push(args);
    },
    click(time, accent) {
      clicks.push({ time, accent });
    },
  };
  const p = newProject();
  p.tempo = 120;
  p.meter = { numerator: 7, denominator: 8 };
  p.progression = [];
  p.melody = [{ pitch: 72, start: 0, beats: 0.4375 }];
  const playback = new Playback(audio, (_, active) => frames.push(active));
  await playback.play(p, false, "all", { countIn: true, recording: true });
  clearInterval(playback.timer);
  assert.equal(notes.length, 0);
  assert.deepEqual(frames[0], []);
  for (let tick = 1; tick <= 74; tick++) {
    audio.context.currentTime = tick * 0.025;
    playback.tick();
  }
  assert.equal(clicks.length, 7);
  assert.equal(clicks[0].accent, true);
  clicks.forEach((click, index) =>
    assert.ok(Math.abs(click.time - (0.04 + index * 0.25)) < 1e-9),
  );
  assert.ok(Math.abs(notes[0][1] - 1.79) < 1e-9);
  playback.stop();
});

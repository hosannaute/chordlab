import test from "node:test";
import assert from "node:assert/strict";
import { AudioEngine } from "../src/audio.js";
import { Playback } from "../src/playback.js";
import { newProject } from "../src/project.js";
class Parameter {
  constructor() {
    this.value = 0;
    this.events = [];
  }
  setValueAtTime(value, at) {
    this.events.push(["set", value, at]);
  }
  exponentialRampToValueAtTime(value, at) {
    this.events.push(["ramp", value, at]);
  }
  setTargetAtTime(value, at) {
    this.events.push(["target", value, at]);
  }
  cancelScheduledValues(at) {
    this.events.push(["cancel", at]);
  }
  cancelAndHoldAtTime(at) {
    this.events.push(["hold", at]);
  }
}
class Node {
  constructor() {
    this.gain = new Parameter();
    this.frequency = new Parameter();
    this.stops = [];
  }
  connect(other) {
    return other;
  }
  disconnect() {
    this.disconnected = true;
  }
  start(at) {
    this.started = at;
  }
  stop(at) {
    this.stops.push(at);
  }
}
class Context {
  constructor() {
    this.currentTime = 0;
    this.state = "suspended";
    this.oscillators = [];
    this.gains = [];
    this.destination = {};
  }
  async resume() {
    this.state = "running";
  }
  createGain() {
    const node = new Node();
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    const node = new Node();
    this.oscillators.push(node);
    return node;
  }
  createBufferSource() {
    const node = new Node();
    node.playbackRate = new Parameter();
    (this.samples ??= []).push(node);
    return node;
  }
  createDynamicsCompressor() {
    return {
      ...new Node(),
      threshold: {},
      knee: {},
      ratio: {},
      attack: {},
      release: {},
      connect: (n) => n,
    };
  }
}
test("audio initializes once, supports independent simultaneous voices and cleans graph nodes", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = Context;
  try {
    const audio = new AudioEngine();
    await audio.init();
    const context = audio.context;
    await audio.init();
    assert.equal(audio.context, context);
    const a = audio.note(60),
      b = audio.note(64),
      c = audio.note(67);
    assert.equal(audio.voices.size, 3);
    a.release();
    assert.equal(audio.voices.size, 3);
    assert.ok(
      context.oscillators.slice(0, 2).every((o) => o.stops.length === 1),
    );
    assert.ok(context.oscillators.slice(2).every((o) => o.stops.length === 0));
    b.release();
    c.release();
    context.oscillators.forEach((o) => o.onended());
    assert.equal(audio.voices.size, 0);
    assert.ok(context.oscillators.every((o) => o.disconnected));
  } finally {
    globalThis.AudioContext = original;
  }
});
test("panic cancels future scheduled notes before onset and voice stealing remains bounded", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = Context;
  try {
    const audio = new AudioEngine();
    await audio.init();
    audio.note(60, 10, 1, "transport");
    audio.stop("transport");
    assert.ok(
      audio.context.oscillators.every((o) => o.stops.at(-1) < o.started),
    );
    for (let i = 0; i < 50; i++) audio.note(60);
    assert.equal(audio.voices.size, 32);
  } finally {
    globalThis.AudioContext = original;
  }
});
function fakeAudio() {
  return {
    context: { currentTime: 0 },
    calls: [],
    stops: [],
    init: async () => {},
    note(...args) {
      this.calls.push(args);
    },
    stop(group) {
      this.stops.push(group);
    },
  };
}
test("sampled piano uses buffer voices with correct pitch, release and cleanup", () => {
  const audio = new AudioEngine();
  audio.context = new Context();
  audio.master = audio.context.createGain();
  audio.instrument = "grand-piano";
  const buffer = {};
  audio.grandPiano = {
    get: () => ({ buffer, peak: 0.5, rate: 2 ** (1 / 12) }),
  };
  const voice = audio.note(61, 0.02, 0.6, "transport"),
    [source] = audio.context.samples;
  assert.equal(source.buffer, buffer);
  assert.equal(source.playbackRate.value, 2 ** (1 / 12));
  assert.equal(audio.context.oscillators.length, 0);
  assert.equal(voice.instrument, "grand-piano");
  audio.stop();
  assert.equal(audio.generation, 1);
  assert.equal(source.stops.at(-1), 0);
  source.onended();
  assert.equal(audio.voices.size, 0);
  assert.equal(source.disconnected, true);
});
test("default transport repeats both chords and melody through several complete passes", async () => {
  const audio = fakeAudio(),
    playback = new Playback(
      audio,
      () => {},
      () => {},
    ),
    project = newProject();
  project.tempo = 120;
  project.progression = [{ degree: 0, beats: 1, seventh: false, inversion: 0 }];
  project.melody = [{ pitch: 72, start: 0, beats: 1 }];
  await playback.play(project);
  clearInterval(playback.timer);
  for (const time of [0.5, 1, 1.5]) {
    audio.context.currentTime = time;
    playback.tick();
  }
  assert.equal(audio.calls.length, 16);
  assert.equal(audio.calls.filter((n) => n[0] === 72).length, 4);
  assert.equal(playback.running, true);
  playback.stop();
  const count = audio.calls.length;
  audio.context.currentTime = 5;
  playback.tick();
  assert.equal(audio.calls.length, count);
});
test("melody-only playback also loops by default", async () => {
  const audio = fakeAudio(),
    playback = new Playback(
      audio,
      () => {},
      () => {},
    ),
    project = newProject();
  project.tempo = 120;
  project.melody = [{ pitch: 72, start: 0, beats: 1 }];
  await playback.play(project, undefined, "melody");
  clearInterval(playback.timer);
  audio.context.currentTime = 0.5;
  playback.tick();
  assert.equal(audio.calls.length, 2);
  assert.ok(audio.calls.every((n) => n[0] === 72));
  playback.stop();
});
test("non-looping visual playhead does not wrap while release tails finish", async () => {
  const audio = fakeAudio();
  let frame;
  const playback = new Playback(
    audio,
    (beat, events) => {
      frame = { beat, events };
    },
    () => {},
  );
  const project = newProject();
  project.tempo = 120;
  project.progression = [{ degree: 0, beats: 1, seventh: false, inversion: 0 }];
  await playback.play(project, false);
  clearInterval(playback.timer);
  audio.context.currentTime = 0.6;
  playback.tick();
  assert.equal(frame.beat, 1);
  assert.equal(frame.events.length, 0);
  playback.stop();
});
test("scheduler limits lookahead, avoids duplicate notes and applies tempo to later events", async () => {
  const audio = fakeAudio(),
    playback = new Playback(
      audio,
      () => {},
      () => {},
    ),
    p = newProject();
  p.tempo = 120;
  await playback.play(p, false);
  clearInterval(playback.timer);
  assert.equal(audio.calls.length, 3);
  playback.tick();
  assert.equal(audio.calls.length, 3);
  audio.context.currentTime = 1;
  playback.setTempo(60);
  audio.context.currentTime = 3.1;
  playback.tick();
  assert.equal(audio.calls.length, 6);
  assert.equal(audio.calls[3][2], 4);
  playback.stop();
  const count = audio.calls.length;
  playback.tick();
  assert.equal(audio.calls.length, count);
  assert.equal(playback.running, false);
});
test("loop crosses boundaries and stop during audio initialization cannot start playback", async () => {
  const audio = fakeAudio(),
    playback = new Playback(
      audio,
      () => {},
      () => {},
    ),
    p = newProject();
  p.progression = [{ degree: 0, beats: 1, seventh: false, inversion: 0 }];
  p.tempo = 120;
  await playback.play(p, true);
  clearInterval(playback.timer);
  audio.context.currentTime = 0.5;
  playback.tick();
  assert.equal(audio.calls.length, 6);
  playback.stop();
  let resume;
  audio.init = () =>
    new Promise((resolve) => {
      resume = resolve;
    });
  const pending = playback.play(p, false);
  playback.stop();
  resume();
  await pending;
  assert.equal(playback.running, false);
});

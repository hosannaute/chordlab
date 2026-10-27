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

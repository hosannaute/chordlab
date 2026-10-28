import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  GrandPiano,
  GRAND_SAMPLES,
  nearestSample,
  LAYER_SAMPLES,
} from "../src/grand-piano.js";
const decoded = () => ({
  duration: 1,
  numberOfChannels: 2,
  getChannelData: () => new Float32Array([0, 0.5, -0.25, 0]),
});
test("optional velocity pack loads distinct soft/hard samples and all 42 files match their checksums", async () => {
  const requests = [],
    bank = new GrandPiano(
      { decodeAudioData: async () => decoded() },
      () => {},
      async (url) => {
        requests.push(url);
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
      },
    );
  await Promise.all([bank.load(true), bank.load(true)]);
  assert.equal(requests.length, 42);
  assert.equal(bank.isReady(true), true);
  assert.equal(bank.isReady(false), false);
  assert.equal(bank.get(60, 48, true).layer, "soft");
  assert.equal(bank.get(60, 112, true).layer, "hard");
  assert.notEqual(
    bank.get(60, 48, true).buffer,
    bank.get(60, 112, true).buffer,
  );
  const directory = new URL("../public/audio/grand-piano/", import.meta.url);
  const manifest = JSON.parse(
    await readFile(new URL("layers/manifest.json", directory), "utf8"),
  );
  assert.equal(manifest.license, "CC-BY-3.0");
  assert.equal(manifest.samples.length, 42);
  for (const sample of LAYER_SAMPLES) {
    const data = await readFile(new URL(sample.file, directory));
    const entry = manifest.samples.find(
      (entry) => entry.file === sample.file.replace("layers/", ""),
    );
    assert.equal(data.length, entry.bytes);
    assert.equal(createHash("sha256").update(data).digest("hex"), entry.sha256);
  }
});
test("grand bank covers every app pitch within one semitone of a recording", () => {
  assert.equal(GRAND_SAMPLES.length, 21);
  for (let pitch = 36; pitch <= 96; pitch++)
    assert.ok(Math.abs(nearestSample(pitch).pitch - pitch) <= 1);
  assert.equal(nearestSample(60).file, "C4.mp3");
});
test("concurrent loads share requests and reuse the complete decoded bank", async () => {
  const requests = [],
    progress = [];
  const bank = new GrandPiano(
    { decodeAudioData: async () => decoded() },
    (loaded, total) => progress.push([loaded, total]),
    async (url) => {
      requests.push(url);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
    },
  );
  await Promise.all([bank.load(), bank.load()]);
  await bank.load();
  assert.equal(requests.length, 21);
  assert.equal(new Set(requests).size, 21);
  assert.equal(bank.get(61).rate, 2 ** (1 / 12));
  assert.equal(bank.get(60).peak, 0.5);
  assert.deepEqual(progress.at(-1), [21, 21]);
});
test("a failed sample load reports failure and retry fetches only missing recordings", async () => {
  let fail = true;
  const requests = [];
  const bank = new GrandPiano(
    { decodeAudioData: async () => decoded() },
    () => {},
    async (url) => {
      requests.push(url);
      if (fail && url.endsWith("/C4.mp3")) return { ok: false, status: 503 };
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
    },
  );
  await assert.rejects(bank.load(), /C4.mp3/);
  assert.equal(bank.buffers.has(60), false);
  const complete = bank.buffers.size,
    count = requests.length;
  fail = false;
  await bank.load();
  assert.equal(requests.length - count, 21 - complete);
  assert.equal(bank.buffers.size, 21);
});
test("unloaded or invalid recordings never silently substitute synthesized audio", async () => {
  const bank = new GrandPiano(
    { decodeAudioData: async () => ({ ...decoded(), duration: 0 }) },
    () => {},
    async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
  );
  assert.throws(() => bank.get(60), /loading/);
  await assert.rejects(bank.load(), /empty/);
});
test("every bundled recording matches its pinned upstream checksum", async () => {
  const directory = new URL("../public/audio/grand-piano/", import.meta.url);
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", directory), "utf8"),
  );
  assert.equal(manifest.samples.length, 21);
  assert.equal(manifest.license, "CC-BY-3.0");
  for (const sample of GRAND_SAMPLES) {
    const data = await readFile(new URL(sample.file, directory)),
      entry = manifest.samples.find((n) => n.pitch === sample.pitch);
    assert.equal(data.length, entry.bytes);
    assert.equal(createHash("sha256").update(data).digest("hex"), entry.sha256);
  }
});

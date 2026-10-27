import test from "node:test";
import assert from "node:assert/strict";
import {
  newProject,
  validateProject,
  composition,
  migrateLegacy,
  transposeProject,
} from "../src/project.js";
import {
  readProjects,
  saveProject,
  deleteProject,
  parseProject,
} from "../src/storage.js";
function memory() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    data,
  };
}
test("project roundtrip and strict validation reject malformed nested data", () => {
  const p = newProject();
  assert.deepEqual(parseProject(JSON.stringify(p)), p);
  for (const patch of [
    { tempo: NaN },
    { tempo: "100" },
    { key: 12 },
    { mode: "dorian" },
    { name: "" },
    { version: 3 },
    { melody: [{ pitch: 200, start: 0, beats: 1 }] },
    { progression: [{ degree: 9, beats: 4 }] },
  ])
    assert.throws(() => validateProject({ ...p, ...patch }));
  assert.throws(() => parseProject("{bad"));
  assert.throws(() => parseProject(" ".repeat(250001)));
});
test("multiple saves update by ID, delete independently, and report write failure", () => {
  const storage = memory(),
    a = newProject(),
    b = newProject();
  saveProject(a, storage);
  saveProject(b, storage);
  saveProject({ ...a, name: "Renamed" }, storage);
  assert.equal(readProjects(storage).length, 2);
  assert.equal(readProjects(storage)[0].name, "Renamed");
  assert.equal(deleteProject(a.id, storage)[0].id, b.id);
  assert.throws(() =>
    saveProject(a, {
      getItem: () => null,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    }),
  );
});
test("legacy data is recovered and preserved after migration", () => {
  const storage = memory(),
    old = JSON.stringify({
      key: "5",
      mode: "minor",
      wave: "triangle",
      tempo: "120",
      sequence: [0, 5, 2, 6],
    });
  storage.setItem("chordlab-v1", old);
  const [p] = readProjects(storage);
  assert.equal(p.key, 5);
  assert.equal(p.instrument, "electric-piano");
  saveProject(p, storage);
  assert.equal(storage.getItem("chordlab-v1"), old);
  assert.equal(readProjects(storage).length, 1);
  assert.throws(() => migrateLegacy({ sequence: [-1] }));
});
test("corrupt library is never silently overwritten", () => {
  const storage = memory();
  storage.setItem("chordlab-projects-v2", "{broken");
  assert.throws(() => saveProject(newProject(), storage));
  assert.equal(storage.getItem("chordlab-projects-v2"), "{broken");
});
test("composition timing accounts for durations, melody and inversions", () => {
  const p = newProject();
  p.progression = [
    { degree: 0, beats: 2, inversion: 1, seventh: false },
    { degree: 4, beats: 1, inversion: 0, seventh: true },
  ];
  p.melody = [{ pitch: 72, start: 3.5, beats: 1 }];
  const c = composition(p);
  assert.equal(c.beats, 4.5);
  assert.equal(c.events.length, 8);
  assert.deepEqual(
    c.events.slice(0, 3).map((e) => e.pitch),
    [52, 55, 60],
  );
  assert.equal(composition(p, "melody").events.length, 1);
  assert.equal(transposeProject(p, 2).melody[0].pitch, 74);
});

import test from "node:test";
import assert from "node:assert/strict";
import { History } from "../src/history.js";
import { newProject } from "../src/project.js";
test("undo/redo restores nested composition edits without aliasing snapshots", () => {
  const p = newProject(),
    history = new History(p);
  p.progression = [];
  history.record(p, "Clear chords");
  p.melody.push({ pitch: 60, start: 0, beats: 1 });
  history.record(p, "Add note");
  const previous = history.undo();
  assert.equal(previous.melody.length, 0);
  previous.name = "External mutation";
  assert.equal(history.undo().progression.length, 4);
  assert.equal(history.redo().name, "Untitled session");
  assert.equal(history.redo().melody.length, 1);
});
test("a new edit discards redo, no-op edits do not, and reset isolates projects", () => {
  const p = newProject(),
    history = new History(p);
  p.name = "A";
  history.record(p);
  p.name = "B";
  history.record(p);
  const a = history.undo();
  history.record(a);
  assert.equal(history.canRedo, true);
  a.tempo = 120;
  history.record(a);
  assert.equal(history.canRedo, false);
  history.reset(newProject());
  assert.equal(history.canUndo, false);
});
test("typing is coalesced, separate controls and post-undo edits remain separate", () => {
  const p = newProject(),
    history = new History(p);
  p.name = "A";
  history.record(p, "Rename", "name", 1);
  p.name = "AB";
  history.record(p, "Rename", "name", 100);
  assert.equal(history.undo().name, "Untitled session");
  const last = history.redo();
  last.tempo = 120;
  history.record(last, "Tempo", "tempo", 200);
  assert.equal(history.undo().tempo, 100);
});
test("history has a bounded memory window", () => {
  const p = newProject(),
    history = new History(p, 2);
  for (const name of ["A", "B", "C"]) {
    p.name = name;
    history.record(p);
  }
  assert.equal(history.undo().name, "B");
  assert.equal(history.undo().name, "A");
  assert.equal(history.undo(), null);
});
test("saving ends typing coalescing so undo can return to the saved checkpoint", () => {
  const p = newProject(),
    history = new History(p);
  p.name = "Saved";
  history.record(p, "Rename", "name", 1);
  history.endGroup();
  p.name = "Saved again";
  history.record(p, "Rename", "name", 2);
  assert.equal(history.undo().name, "Saved");
});

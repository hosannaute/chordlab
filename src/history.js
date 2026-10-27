// Snapshot ownership stays here: callers can mutate returned projects safely.
export class History {
  constructor(project, limit = 100) {
    this.limit = limit;
    this.reset(project);
  }
  reset(project) {
    this.entries = [
      {
        project: structuredClone(project),
        signature: JSON.stringify(project),
        label: "Initial project",
      },
    ];
    this.index = 0;
    this.group = null;
    this.time = 0;
  }
  get canUndo() {
    return this.index > 0;
  }
  get canRedo() {
    return this.index < this.entries.length - 1;
  }
  endGroup() {
    this.group = null;
  }
  record(project, label = "Edit composition", group = null, now = Date.now()) {
    const signature = JSON.stringify(project);
    if (signature === this.entries[this.index].signature) return;
    const coalesce =
      group &&
      group === this.group &&
      now - this.time < 700 &&
      this.index > 0 &&
      !this.canRedo;
    this.entries.length = this.index + 1;
    const entry = { project: structuredClone(project), signature, label };
    if (coalesce) this.entries[this.index] = entry;
    else {
      this.entries.push(entry);
      this.index++;
      if (this.entries.length > this.limit + 1) {
        this.entries.shift();
        this.index--;
      }
    }
    this.group = group;
    this.time = now;
  }
  undo() {
    if (!this.canUndo) return null;
    this.index--;
    this.group = null;
    return structuredClone(this.entries[this.index].project);
  }
  redo() {
    if (!this.canRedo) return null;
    this.index++;
    this.group = null;
    return structuredClone(this.entries[this.index].project);
  }
}

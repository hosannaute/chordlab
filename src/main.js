import "./style.css";
import {
  KEYS,
  scale,
  scaleNames,
  diatonicChord,
  describeChord,
  pitchName,
  buildChord,
} from "./theory.js";
import { newProject, transposeProject, composition } from "./project.js";
import {
  readProjects,
  saveProject,
  deleteProject,
  parseProject,
} from "./storage.js";
import { exportMidi } from "./midi.js";
import { AudioEngine } from "./audio.js";
import { Playback } from "./playback.js";
import { Piano } from "./piano.js";
import { LESSONS } from "./lessons.js";
const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const button = (text, label, action) => {
  const b = el("button", "", text);
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.onclick = action;
  return b;
};
let project = newProject(),
  library = [],
  dirty = false,
  selectedChord = { degree: 0, inversion: 0, seventh: false },
  selectedNote = -1,
  loop = false;
const audio = new AudioEngine();
const compact = window.matchMedia("(max-width: 720px)").matches;
const melodyColumns = compact ? 8 : 16;
if (compact) $("octaves").value = "1";
function report(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
const piano = new Piano($("piano"), audio, report);
piano.octaves = +$("octaves").value;
piano.draw();
const playback = new Playback(
  audio,
  (beat, events) => {
    $("play").innerHTML = "Ⅱ <span>Playing</span>";
    const active = new Set(
      events.filter((e) => e.track === "chords").map((e) => e.index),
    );
    [...$("sequence").children].forEach((node, index) =>
      node.classList.toggle("playing", active.has(index)),
    );
    piano.highlight(
      undefined,
      undefined,
      events.map((e) => e.pitch),
    );
    $("melody-grid")
      .querySelectorAll("[data-start]")
      .forEach((node) =>
        node.classList.toggle(
          "playhead",
          Math.floor(+node.dataset.start * 2) === Math.floor(beat * 2),
        ),
      );
  },
  () => {
    $("play").innerHTML = "▶ <span>Play</span>";
    $("sequence")
      .querySelectorAll(".playing")
      .forEach((n) => n.classList.remove("playing"));
    $("melody-grid")
      .querySelectorAll(".playhead")
      .forEach((n) => n.classList.remove("playhead"));
    piano.highlight(undefined, undefined, []);
  },
);
function changed(message) {
  dirty = true;
  $("save-project").textContent = "Save project •";
  if (message) report(message);
}
function edit() {
  playback.stop();
  audio.stop("lesson");
}
function canLeave() {
  return (
    !dirty ||
    window.confirm("This project has unsaved changes. Continue without saving?")
  );
}
function chordData(c = selectedChord) {
  return diatonicChord(
    project.key,
    project.mode,
    c.degree,
    c.seventh,
    c.inversion,
  );
}
async function hear(c = selectedChord) {
  try {
    await audio.init();
    audio.stop("preview");
    const data = chordData(c);
    data.notes.forEach((n) =>
      audio.note(n, audio.context.currentTime, 0.8, "preview"),
    );
  } catch (e) {
    report(e.message, true);
  }
}
function inspect(c) {
  selectedChord = { ...c };
  const chord = chordData();
  $("chord-title").textContent = chord.name;
  $("chord-roman").textContent =
    `${chord.roman} · ${KEYS[project.key]} ${project.mode}${c.inversion ? ` · inversion ${c.inversion}` : ""}`;
  $("chord-notes").replaceChildren(
    ...chord.names.map((n) => el("span", "", n)),
  );
  $("chord-quality").textContent =
    {
      maj7: "major seventh",
      min7: "minor seventh",
      dom7: "dominant seventh",
      halfdim7: "half-diminished seventh",
    }[chord.quality] || chord.quality;
  $("chord-formula").textContent = chord.intervals.join(" · ");
  $("chord-function").textContent = describeChord(chord, project.mode);
  piano.highlight(
    chord.notes,
    $("scale-highlight").checked ? scale(project.key, project.mode) : [],
  );
  $("palette")
    .querySelectorAll("button")
    .forEach((b, i) => b.classList.toggle("selected", i === c.degree));
}
function drawPalette() {
  $("palette").replaceChildren(
    ...Array.from({ length: 7 }, (_, degree) => {
      const c = {
          degree,
          beats: 4,
          inversion: 0,
          seventh: $("sevenths").checked,
        },
        data = chordData(c);
      const b = button("", `Add ${data.name}, ${data.roman}`, () => {
        if (project.progression.length >= 128)
          return report("Maximum 128 chords per project.", true);
        edit();
        project.progression.push({ ...c });
        changed(`Added ${data.name}.`);
        drawSequence();
        inspect(c);
        hear(c);
      });
      b.append(el("strong", "", data.name), el("small", "", data.roman));
      return b;
    }),
  );
}
function selectControl(labelText, values, current, onChange) {
  const label = el("label", "", labelText),
    select = el("select");
  select.setAttribute("aria-label", labelText);
  values.forEach(([value, text]) => select.add(new Option(text, value)));
  select.value = current;
  select.onchange = () => onChange(select.value);
  label.append(select);
  return label;
}
function drawSequence(focusIndex = null, focusAction = null) {
  $("sequence").replaceChildren(
    ...project.progression.map((c, i) => {
      const data = chordData(c),
        li = el("li", "chord-card"),
        top = el("div", "chord-card-top");
      const preview = button("", `Hear chord ${i + 1}: ${data.name}`, () => {
        inspect(c);
        hear(c);
      });
      preview.append(el("strong", "", data.name));
      top.append(
        preview,
        el("small", "", `${String(i + 1).padStart(2, "0")} / ${data.roman}`),
      );
      const controls = el("div", "chord-edit");
      controls.append(
        selectControl(
          `CHORD ${i + 1} BEATS`,
          [0.5, 1, 2, 4, 8].map((n) => [
            n,
            n === 0.5 ? "½ beat" : `${n} beats`,
          ]),
          c.beats,
          (value) => {
            edit();
            c.beats = +value;
            changed();
            drawSequence(i, "beats");
          },
        ),
        selectControl(
          `INVERSION ${i + 1}`,
          Array.from({ length: c.seventh ? 4 : 3 }, (_, n) => [
            n,
            n ? `${n}${n === 1 ? "st" : n === 2 ? "nd" : "rd"}` : "Root",
          ]),
          c.inversion,
          (value) => {
            edit();
            c.inversion = +value;
            changed();
            drawSequence(i, "inversion");
            inspect(c);
            hear(c);
          },
        ),
      );
      const actions = el("div", "chord-actions");
      for (const [text, name] of [
        ["←", "earlier"],
        ["→", "later"],
        ["⧉", "duplicate"],
        ["×", "remove"],
      ]) {
        const b = button(text, `${name} chord ${i + 1}`, () => {
          edit();
          if (name === "duplicate") {
            if (project.progression.length >= 128)
              return report("Maximum 128 chords.", true);
            project.progression.splice(i + 1, 0, { ...c });
          } else if (name === "remove") project.progression.splice(i, 1);
          else {
            const target = name === "earlier" ? i - 1 : i + 1;
            [project.progression[i], project.progression[target]] = [
              project.progression[target],
              project.progression[i],
            ];
          }
          changed();
          drawSequence(
            name === "earlier"
              ? i - 1
              : name === "later"
                ? i + 1
                : Math.min(i, project.progression.length - 1),
            name,
          );
          inspect(c);
        });
        b.dataset.action = name;
        b.disabled =
          (name === "earlier" && i === 0) ||
          (name === "later" && i === project.progression.length - 1);
        actions.append(b);
      }
      li.append(top, controls, actions);
      return li;
    }),
  );
  if (!project.progression.length)
    $("sequence").append(
      el("li", "empty-state", "An open canvas. Add a chord above to begin."),
    );
  $("progression-length").textContent =
    `${project.progression.reduce((sum, c) => sum + c.beats, 0)} beats`;
  updateTransport();
  const card = $("sequence").children[focusIndex];
  if (card && focusAction) {
    const target =
      focusAction === "beats"
        ? card.querySelector("select")
        : focusAction === "inversion"
          ? card.querySelectorAll("select")[1]
          : card.querySelector(`[data-action="${focusAction}"]`);
    (target?.disabled ? card.querySelector("button") : target)?.focus();
  }
}
function updateTransport() {
  const empty = !project.progression.length && !project.melody.length;
  $("play").disabled = $("export-midi").disabled = empty;
  $("play-melody").disabled = !project.melody.length;
}
function drawMelody(focusCell = null) {
  const grid = $("melody-grid"),
    page = +$("melody-page").value || 0,
    startBeat = (page * melodyColumns) / 2;
  grid.style.setProperty("--roll-columns", melodyColumns);
  grid.replaceChildren(el("span", "roll-label", ""));
  for (let col = 0; col < melodyColumns; col++)
    grid.append(
      el(
        "span",
        "roll-label beat",
        col % 2 ? "·" : String(startBeat + col / 2 + 1),
      ),
    );
  // A two-octave viewport follows the selected keyboard octave; paging exposes all 32 bars.
  const base = (+$("octave").value + 1) * 12;
  for (let pitch = Math.min(95, base + 24); pitch >= base; pitch--) {
    grid.append(el("span", "roll-label", pitchName(pitch)));
    for (let col = 0; col < melodyColumns; col++) {
      const start = startBeat + col / 2;
      const index = project.melody.findIndex(
        (n) =>
          n.pitch === pitch && start >= n.start && start < n.start + n.beats,
      );
      const b = button(
        "",
        `${pitchName(pitch)}${Math.floor(pitch / 12) - 1}, beat ${start + 1}${index >= 0 ? ", edit note" : ", add note"}`,
        () => {
          if (index >= 0) {
            selectedNote = index;
            $("note-duration").value = project.melody[index].beats;
          } else {
            if (project.melody.length >= 512)
              return report("Maximum 512 melody notes.", true);
            const beats = Math.min(+$("note-duration").value, 128 - start);
            if (
              project.melody.some(
                (n) =>
                  n.pitch === pitch &&
                  n.start < start + beats &&
                  n.start + n.beats > start,
              )
            )
              return report(
                "This note would overlap another note of the same pitch.",
                true,
              );
            edit();
            project.melody.push({ pitch, start, beats });
            selectedNote = project.melody.length - 1;
            changed("Melody note added.");
            piano.tap(pitch);
          }
          drawMelody({ pitch, start });
        },
      );
      b.className = "roll-cell";
      b.dataset.pitch = pitch;
      b.dataset.start = start;
      b.setAttribute("aria-pressed", String(index >= 0));
      b.tabIndex = -1;
      if ([1, 3, 6, 8, 10].includes(pitch % 12)) b.classList.add("sharp");
      if (col % 8 === 0) b.classList.add("bar-start");
      if (index >= 0) {
        b.classList.add(
          project.melody[index].start === start ? "on" : "continued",
        );
        if (index === selectedNote) b.classList.add("selected");
      }
      grid.append(b);
    }
  }
  const cells = [...grid.querySelectorAll("button")];
  const target = focusCell
    ? cells.find(
        (n) =>
          +n.dataset.pitch === focusCell.pitch &&
          +n.dataset.start === focusCell.start,
      )
    : cells[0];
  if (target) {
    target.tabIndex = 0;
    if (focusCell) target.focus();
  }
  const note = project.melody[selectedNote];
  $("note-editor").hidden = !note;
  if (note)
    $("selected-note").textContent =
      `${pitchName(note.pitch)}${Math.floor(note.pitch / 12) - 1} · beat ${note.start + 1} · ${note.beats} beat${note.beats === 1 ? "" : "s"}`;
  $("melody-count").textContent =
    `${project.melody.length} note${project.melody.length === 1 ? "" : "s"} · 4/4 time`;
  updateTransport();
}
$("melody-grid").onkeydown = (e) => {
  const cells = [...$("melody-grid").querySelectorAll("button")],
    index = cells.indexOf(e.target);
  if (
    index < 0 ||
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(e.key)
  )
    return;
  e.preventDefault();
  const target =
    e.key === "Home"
      ? Math.floor(index / melodyColumns) * melodyColumns
      : e.key === "End"
        ? Math.floor(index / melodyColumns) * melodyColumns + melodyColumns - 1
        : Math.max(
            0,
            Math.min(
              cells.length - 1,
              index +
                {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -melodyColumns,
                  ArrowDown: melodyColumns,
                }[e.key],
            ),
          );
  e.target.tabIndex = -1;
  cells[target].tabIndex = 0;
  cells[target].focus();
};
function drawLibrary() {
  $("project-count").textContent = library.length;
  $("project-list").replaceChildren(
    ...library.map((p) => {
      const row = el("div", "library-item"),
        text = el("div"),
        actions = el("div", "row");
      text.append(
        el("strong", "", p.name),
        el(
          "p",
          "hint",
          `${KEYS[p.key]} ${p.mode} · ${p.tempo} BPM · ${p.progression.length} chords`,
        ),
      );
      actions.append(
        button("Open", `Open ${p.name}`, () => {
          if (canLeave()) load(structuredClone(p));
        }),
        button("Delete", `Delete ${p.name}`, () => {
          if (
            !window.confirm(
              `Delete saved project “${p.name}”? This cannot be undone.`,
            )
          )
            return;
          try {
            library = deleteProject(p.id);
            drawLibrary();
            report(
              "Saved project deleted. The open composition is still available.",
            );
          } catch (e) {
            report(e.message, true);
          }
        }),
      );
      row.append(text, actions);
      return row;
    }),
  );
  if (!library.length)
    $("project-list").append(
      el("p", "hint", "No saved projects yet. Your next idea starts here."),
    );
}
function load(p) {
  edit();
  piano.panic();
  project = p;
  dirty = false;
  selectedNote = -1;
  $("project-name").value = p.name;
  $("key").value = p.key;
  $("mode").value = p.mode;
  $("tempo").value = p.tempo;
  $("instrument").value = audio.instrument = p.instrument;
  $("save-project").textContent = "Save project";
  drawPalette();
  drawSequence();
  inspect(p.progression[0] || { degree: 0, seventh: false, inversion: 0 });
  drawMelody();
  report(`Opened ${p.name}.`);
}
function download(bytes, type, extension) {
  const url = URL.createObjectURL(new Blob([bytes], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download =
    (project.name.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "chordlab") +
    extension;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
KEYS.forEach((name, index) => $("key").add(new Option(name, index)));
for (let page = 0; page < 256 / melodyColumns; page++)
  $("melody-page").add(
    new Option(
      compact ? String(page + 1) : `${page * 2 + 1}–${page * 2 + 2}`,
      page,
    ),
  );
$("project-name").oninput = () => {
  project.name = $("project-name").value.trim() || "Untitled session";
  changed();
};
$("new-project").onclick = () => {
  if (canLeave()) load(newProject());
};
$("save-project").onclick = () => {
  try {
    library = saveProject(project);
    dirty = false;
    $("save-project").textContent = "Save project";
    drawLibrary();
    report(`Saved ${project.name} in this browser.`);
  } catch (e) {
    report(`Could not save: ${e.message} Export JSON to keep a backup.`, true);
  }
};
$("projects-toggle").onclick = () => {
  $("library").hidden = !$("library").hidden;
  $("projects-toggle").setAttribute(
    "aria-expanded",
    String(!$("library").hidden),
  );
};
$("export-json").onclick = () =>
  download(JSON.stringify(project, null, 2), "application/json", ".json");
$("import-json").onclick = () => $("file-input").click();
$("file-input").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 250000)
      throw new Error("Project file is too large (maximum 250 KB).");
    const parsed = parseProject(await file.text());
    if (canLeave()) {
      parsed.id = crypto.randomUUID();
      load(parsed);
      changed("Imported project. Save to add it to your library.");
    }
  } catch (error) {
    report(error.message, true);
  }
  e.target.value = "";
};
$("export-midi").onclick = () => {
  try {
    download(exportMidi(project), "audio/midi", ".mid");
    report("MIDI exported with tempo and separate composition tracks.");
  } catch (e) {
    report(e.message, true);
  }
};
async function play(part = "all") {
  try {
    audio.stop("lesson");
    await playback.play(structuredClone(project), loop, part);
    if (playback.running)
      report(
        `Playing ${part === "melody" ? "melody" : "composition"}${loop ? " in a loop" : ""}.`,
      );
  } catch (e) {
    report(e.message, true);
  }
}
$("play").onclick = () => {
  if (playback.running) {
    playback.stop();
    report("Playback stopped.");
  } else play();
};
$("stop").onclick = () => {
  playback.stop();
  piano.panic();
  report("Stopped. All notes released.");
};
$("play-melody").onclick = () => play("melody");
$("loop").onclick = () => {
  loop = !loop;
  playback.loop = loop;
  $("loop").setAttribute("aria-pressed", String(loop));
};
$("tempo").onchange = () => {
  const tempo = +$("tempo").value;
  if (!Number.isInteger(tempo) || tempo < 40 || tempo > 220) {
    $("tempo").value = project.tempo;
    return report("Choose a tempo from 40 to 220 BPM.", true);
  }
  project.tempo = tempo;
  playback.setTempo(tempo);
  changed("Tempo updated. New notes follow the new tempo.");
};
$("tempo").oninput = () => {
  const tempo = +$("tempo").value;
  if (Number.isInteger(tempo) && tempo >= 40 && tempo <= 220) {
    project.tempo = tempo;
    playback.setTempo(tempo);
    changed();
  }
};
$("key").onchange = () => {
  try {
    project = transposeProject(project, +$("key").value);
    edit();
    changed("Transposed chords and melody.");
    drawPalette();
    drawSequence();
    inspect(selectedChord);
    drawMelody();
  } catch (e) {
    $("key").value = project.key;
    report(e.message, true);
  }
};
$("mode").onchange = () => {
  edit();
  project.mode = $("mode").value;
  changed("Scale changed. Melody pitches are kept.");
  drawPalette();
  drawSequence();
  inspect(selectedChord);
};
$("sevenths").onchange = drawPalette;
$("preset").onchange = () => {
  const type = $("preset").value;
  if (!type) return;
  if (
    project.progression.length &&
    !window.confirm(
      "Replace the current chord progression with this idea? Your melody will be kept.",
    )
  ) {
    $("preset").value = "";
    return;
  }
  edit();
  const minor = type === "minor";
  project.mode = minor ? "minor" : "major";
  $("mode").value = project.mode;
  const degrees = {
    pop: [0, 4, 5, 3],
    sensitive: [5, 3, 0, 4],
    classic: [0, 3, 4, 0],
    jazz: [1, 4, 0],
    minor: [0, 5, 2, 6],
  }[type];
  project.progression = degrees.map((degree) => ({
    degree,
    beats: 4,
    inversion: 0,
    seventh: type === "jazz",
  }));
  changed("Progression loaded.");
  drawPalette();
  drawSequence();
  inspect(project.progression[0]);
  $("preset").value = "";
};
$("clear-chords").onclick = () => {
  if (!project.progression.length || !window.confirm("Clear all chords?"))
    return;
  edit();
  project.progression = [];
  changed();
  drawSequence();
};
$("preview-chord").onclick = () => hear();
$("instrument").onchange = () => {
  piano.panic();
  project.instrument = audio.instrument = $("instrument").value;
  changed();
};
$("volume").oninput = () => {
  audio.setVolume(+$("volume").value / 100);
  $("volume-label").textContent = $("volume").value + "%";
};
for (const id of ["octave", "octaves"])
  $(id).onchange = () => {
    piano.panic();
    piano.octave = +$("octave").value;
    piano.octaves = +$("octaves").value;
    piano.draw();
    inspect(selectedChord);
    drawMelody();
  };
$("note-labels").onchange = () => {
  piano.labels = $("note-labels").checked;
  piano.draw();
};
$("scale-highlight").onchange = () => inspect(selectedChord);
$("sustain").onclick = () => {
  piano.buttonSustain = !piano.buttonSustain;
  piano.refreshSustain();
};
$("melody-page").onchange = () => drawMelody();
$("clear-melody").onclick = () => {
  if (!project.melody.length || !window.confirm("Clear the melody?")) return;
  edit();
  project.melody = [];
  selectedNote = -1;
  changed();
  drawMelody();
};
$("note-duration").onchange = () => {
  const note = project.melody[selectedNote];
  if (!note) return;
  const beats = +$("note-duration").value;
  if (
    note.start + beats > 128 ||
    project.melody.some(
      (n, i) =>
        i !== selectedNote &&
        n.pitch === note.pitch &&
        n.start < note.start + beats &&
        n.start + n.beats > note.start,
    )
  ) {
    $("note-duration").value = note.beats;
    return report(
      "That duration overlaps a note or exceeds the timeline.",
      true,
    );
  }
  edit();
  note.beats = beats;
  changed();
  drawMelody();
};
document.querySelectorAll("[data-note-action]").forEach(
  (b) =>
    (b.onclick = () => {
      const note = project.melody[selectedNote];
      if (!note) return;
      const action = b.dataset.noteAction,
        next = { ...note };
      if (action === "earlier") next.start -= 0.5;
      if (action === "later") next.start += 0.5;
      if (action === "up") next.pitch++;
      if (action === "down") next.pitch--;
      if (
        action !== "delete" &&
        (next.start < 0 ||
          next.start + next.beats > 128 ||
          next.pitch < 36 ||
          next.pitch > 95 ||
          project.melody.some(
            (n, i) =>
              i !== selectedNote &&
              n.pitch === next.pitch &&
              n.start < next.start + next.beats &&
              n.start + n.beats > next.start,
          ))
      )
        return report(
          "This move is outside the timeline or overlaps a note.",
          true,
        );
      edit();
      if (action === "delete") {
        project.melody.splice(selectedNote, 1);
        selectedNote = -1;
      } else {
        project.melody[selectedNote] = next;
        $("melody-page").value = Math.floor(next.start / (melodyColumns / 2));
        piano.tap(next.pitch);
      }
      changed();
      drawMelody();
    }),
);
$("lesson").onchange = () => {
  $("lesson-text").textContent = LESSONS[$("lesson").value];
};
$("lesson-play").onclick = async () => {
  try {
    edit();
    await audio.init();
    const now = audio.context.currentTime + 0.03,
      root = 60 + project.key;
    const note = (pitch, offset, duration = 0.4) =>
      audio.note(pitch, now + offset, duration, "lesson");
    const chord = (notes, offset) => notes.forEach((n) => note(n, offset, 0.7));
    switch ($("lesson").value) {
      case "scale": {
        const notes = scale(project.key, project.mode);
        notes.forEach((n, i) =>
          note(root + ((n - project.key + 12) % 12), i * 0.35),
        );
        note(root + 12, 2.45);
        piano.highlight([], notes);
        break;
      }
      case "chord": {
        const notes = chordData().notes;
        notes.forEach((n, i) => note(n, i * 0.4));
        chord(notes, 1.4);
        break;
      }
      case "mood":
        chord(buildChord(root, "major"), 0);
        chord(buildChord(root, "minor"), 1.1);
        break;
      case "inversion":
        chord(buildChord(root, "major"), 0);
        chord(buildChord(root, "major", 1), 1.1);
        break;
      case "transpose":
        chord(buildChord(root, "major"), 0);
        chord(buildChord(root + 2, "major"), 1.1);
        break;
      default: {
        const degrees =
          $("lesson").value === "together"
            ? [4, 0]
            : project.mode === "minor"
              ? [0, 5, 2, 6]
              : [0, 4, 5, 3];
        degrees.forEach((d, i) =>
          chord(diatonicChord(project.key, project.mode, d).notes, i * 0.9),
        );
      }
    }
    report("Playing a theory example. Stop releases all sound.");
  } catch (e) {
    report(e.message, true);
  }
};
window.addEventListener("blur", () => {
  piano.panic();
  playback.stop();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    piano.panic();
    playback.stop();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
try {
  library = readProjects();
  if (library.length) load(structuredClone(library.at(-1)));
  else load(project);
} catch (e) {
  load(project);
  report(
    `Could not read saved projects: ${e.message} Existing browser data was kept.`,
    true,
  );
}
drawLibrary();
$("lesson").onchange();

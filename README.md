# CHORDLAB

**A little room for big ideas.** A browser-local music workspace for exploring harmony, playing a polyphonic instrument, and composing short chord-and-melody sketches.

[Open the studio](https://hosannaute.github.io/chordlab/) · [Test and build](https://github.com/hosannaute/chordlab/actions/workflows/ci.yml) · [Deployment](https://github.com/hosannaute/chordlab/actions/workflows/pages.yml)

![CHORDLAB desktop workspace](docs/screenshots/desktop.jpg)

<details><summary>Compact melody editor and phone playback controls</summary>

![CHORDLAB phone melody editor](docs/screenshots/mobile-editor.jpg)

</details>

## What you can do

- Explore major and natural minor in all 12 chromatic keys, with contextual enharmonic spelling, diatonic triads and seventh chords.
- Borrow chords from another major/minor key without changing the home key. Build any root with major, minor, dim, aug, dominant 7, major 7, minor 7, dim7 or half-diminished 7 quality. Choose a short length for passing chords.
- Build progressions with individual previews, durations, inversions, duplication, removal, and accessible move controls. Five starting ideas include ii–V–I and i–VI–III–VII.
- Inspect each chord's notes, Roman numeral, semitone formula and musical function.
- Play one or two octaves with mouse, touch pointers or the computer keyboard. **Sustain: On/Off** sits beside the piano heading and spans the phone width. Space also holds the keyboard pedal; Stop releases it.
- Play a sampled Grand Piano using Alexander Holm's Salamander recordings of a Yamaha C5. New projects use Grand Piano; existing projects retain their saved sound. Soft Piano, Electric Piano, Synth Pad, Plucked Synth and Organ remain available.
- Compose up to 512 melody notes. Start with eight equal note positions in one bar, with optional 16- or 32-position grids. Add bars, repeat a phrase into editable copies, and move, resize or delete notes. Previous/Next and optional playback following keep long phrases accessible on phones.
- Undo/redo up to 100 composition edits, including clearing a part or replacing a progression. Consecutive typing changes are grouped, and undo tracks the saved composition accurately.
- Start with a compact scale-note melody view, reveal chromatic notes, and drag notes or their right edges to move/resize them. Editing buttons and keyboard navigation remain available.
- Keep Play, Stop, Loop, Undo and Redo within reach using the fixed phone playback bar. Sound and keyboard settings fold away on smaller screens.
- Chords and melody loop independently on the same tempo clock. New melody phrases use **one bar with eight note positions** and repeat continuously until you add another bar. Separate **Chord sustain** and **Melody sustain** controls let either part ring longer.
- Save, rename, reopen and delete multiple local projects. Import/export validated version-2 JSON backups.
- Export standard format-1 MIDI with a tempo/time-signature track and separate chord/melody tracks.
- Learn eight short theory topics with audio examples.

## Run locally

Use Node.js **22.12+** or a supported newer LTS release, plus npm.

```sh
git clone https://github.com/hosannaute/chordlab.git
cd chordlab
npm ci
npm run dev
```

Open the printed URL, normally `http://127.0.0.1:5173/chordlab/`. ES modules require an HTTP server; opening `index.html` directly is no longer supported.

| Command           | Purpose                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`     | Local development with Vite                                                         |
| `npm test`        | Node unit tests for theory, projects, storage, audio lifecycle, scheduling and MIDI |
| `npm run build`   | Production files in `dist/`                                                         |
| `npm run preview` | Serve the compiled production build                                                 |

No runtime package dependencies. The application uses vanilla JavaScript ES modules, semantic HTML, CSS, Web Audio, Pointer Events, Blob downloads, and localStorage. Vite is the only direct development dependency. Optional Google Fonts requests improve typography; system fonts are the fallback. Composition data is never uploaded by the app.

## First sketch

1. Pick a key and scale. Tap chord buttons to add and hear them.
2. Change each chord's length and inversion. Use the arrow controls to reorder.
3. Add melody notes to the grid. Select a note to change its length or use its move/delete controls.
4. Choose a time signature, then press Play to hear both parts repeat until stopped. Each part loops at its own length on the same clock. Melody only uses the same melody loop length.
5. Name the project and press Save. Use Library → Export JSON for a portable backup, or Export MIDI to continue in another music tool.

Changing the key transposes the melody by the shortest semitone distance as well as rebuilding the diatonic chords. Changing major/minor changes chord harmony but deliberately keeps melody pitches. Loop off and MIDI export produce one arrangement spanning the longer part, repeating shorter phrases to fill it.

### Time signature, continuous melody and more notes

The time signature controls bar divisions. Set a numerator from **1–32** and a denominator of **1, 2, 4, 8, 16 or 32**: examples include 3/4, 6/8, 7/8 and 5/16. Tempo always counts quarter notes; a 6/8 bar lasts three quarter-note beats. Changing meter rescales melody timing to keep the same musical bar positions; chord timing changes only with **One bar per chord**. **One bar per chord** adjusts all chord lengths to the new meter when desired, and Undo restores the previous lengths.

New projects start with **one bar containing eight equal note positions** on both phone and desktop. In 4/4 these are eighth-note positions; in other meters the eight positions divide the selected bar evenly. The last position ends exactly at the next bar-one onset, so the melody repeats continuously while longer chord progressions continue. **Add bar** explicitly extends the phrase by one bar and opens it. **Repeat phrase** creates an editable copy. Empty extra bars are never shown automatically.

Choose **Grid → 16 positions / bar** or **32 positions / bar** for finer subdivisions where supported. Previous/Next reaches bars you have added. Fine grids scroll within their panel on phones. **Follow playback** follows the current page and horizontal playhead. A project supports **512 melody notes**, within 128 quarter-note beats. Existing saved multi-bar compositions keep their length: select **Loop length → 1 bar** (or **Auto · whole bars**) to remove unwanted empty trailing bars; a shorter loop cannot hide existing notes.

**Chord sustain** and **Melody sustain** are independent saved controls: Off, Short (+½ quarter-note beat), Medium (+1) or Long (+2). Sustain extends note release timing without changing the written note positions or the loop length, and clears at that part's loop boundary. Stop cancels both parts immediately. MIDI exports the extended gates at 960 PPQN; repeated attacks at the same pitch remain separate. The live keyboard's Space/button pedal remains available independently.

Older version-2 saves default to 4/4 and automatic melody length without changing notes or instrument. Meter, loop length and chromatic chord fields survive saves and JSON import/export. Re-saving an earlier library entry makes it the project restored on reload. See [timing details](docs/TIMING.md) and [borrowed chords and sustain](docs/CHORDS.md).

### Keyboard access

`A W S E D F T G Y H U J K O L P ;` play consecutive semitones from the selected starting C. Hold Space for sustain when focus is outside an input or button, or use the Sustain toggle. Input fields keep normal typing behavior. Piano buttons also support normal Enter/Space activation. The melody grid uses a single Tab stop with arrow navigation, Home/End within a row, and Enter/Space to add/select a note. All destructive library actions ask for confirmation.

Outside text fields, Ctrl/Command+Z undoes a composition edit; Ctrl/Command+Shift+Z or Ctrl+Y redoes it. Delete/Backspace removes a focused melody note. Clearing a part and replacing a preset are now reversible without confirmation; deleting a saved library project still asks first. Undo history is local to the currently open project and is reset when opening another project.

## Architecture

The original one-file implementation was refactored without adding a UI framework. Pure music/data modules remain independent from browser controls.

```text
src/
  theory.js    scales, contextual spelling, chord qualities, inversions, transposition
  project.js   versioned schema, validation, legacy migration, composition event timeline
  audio.js     sampled/synthesized voices, envelopes, master gain and graph cleanup
  grand-piano.js  lazy sample loading, decoding, caching and nearest-note mapping
  playback.js  audio-clock lookahead scheduler, loop and cancellation
  piano.js     pointer/keyboard ownership, sustain, pressed-state rendering
  storage.js   local project library and JSON import
  midi.js      format-1 SMF encoding at 960 ticks per quarter note
  lessons.js   short beginner-friendly explanations
  history.js   bounded undo/redo snapshots and grouped typing edits
  melody.js    validated note edits, scale rows and responsive page mapping
  timing.js    meter, quarter-note units, phrase length and bounded grid pages
  main.js      application state, DOM components, editing and downloads
  style.css    responsive workspace, touch controls and visible focus
test/          unit tests with no testing-framework dependency
docs/          initial audit, verification notes, audio harness and screenshots
```

Audio initializes and resumes after user interaction. Each note owns its sample source or oscillators and envelope; release disconnects the complete graph. A 32-voice budget, conservative per-voice gain, normalized harmonics and a master compressor manage polyphony/headroom. Live piano ownership uses independent pointer and keyboard IDs, so releasing one input does not release another. Pending initialization cannot resurrect a released note. Stop, window blur and document hiding release sound; playback does not continue in the background.

### Grand Piano recordings

The first Grand Piano play loads approximately **1.4 MB** of self-hosted MP3 recordings, with visible progress and retryable errors. The decoded bank is reused for the page session; network caching follows the browser's normal HTTP cache. The synth sounds load immediately without the sample bank. No API key, account, audio CDN or runtime library is required.

The bank contains 21 recordings from C2 through C7, mapped to neighboring pitches within one semitone across the app's range. It is a compact single-layer selection, not the full Salamander instrument: multiple velocity layers, sympathetic resonance and pedal/hammer noises are omitted. Decoded audio occupies about **96 MiB** at 44.1 kHz in the tested browser; memory varies with the audio context's sample rate. MIDI export carries notes and a program suggestion, not these recordings.

Recordings are by **Alexander Holm**, licensed **CC BY 3.0**, distributed via the [Tone.js audio repository](https://github.com/Tonejs/audio/tree/efd8296360f9526e379bfbe5c1698ff54d6a1d34/salamander). See the [original Salamander project](https://github.com/sfzinstruments/SalamanderGrandPiano), [bundled attribution](public/audio/grand-piano/ATTRIBUTION.md) and checksum manifest. The files are unmodified; playback repitches and applies gain/envelopes. Source revision and SHA-256 hashes are pinned locally.

The scheduler wakes every 25 ms and schedules approximately 120 ms ahead using `AudioContext.currentTime`. Each part has a sorted event list, loop period and cursor on that shared clock; it does not expand an infinite composition or wait for the other part to end. UI editing stops playback so a composition cannot silently diverge from the audible timeline. Rapid stop/start uses a generation guard to cancel pending audio initialization.

### Music theory

Major uses `[0,2,4,5,7,9,11]`; natural minor uses `[0,2,3,5,7,8,10]`. Diatonic chords stack alternate scale degrees while preserving octave offsets. All four triad qualities and major, minor, dominant, fully diminished and half-diminished sevenths are available. The palette follows the home key or a separate borrowing key; the builder exposes every quality on all twelve roots.

Pitch classes and spelled note names are separate. A scale advances through seven distinct letters and applies sharps/flats as required, including E♯ in F♯ major. Natural minor correctly uses **v**, not a major V. Inversions rotate the lowest chord tones up an octave; changing an inversion never changes its harmonic identity.

### Storage and MIDI

The `chordlab-projects-v2` library holds up to 100 projects, each with at most 128 chords and 512 melody notes. The melody timeline spans 128 quarter-note beats and MIDI pitches 36–95. Note onsets support 1/32-note resolution. Imports validate numeric ranges, meter, phrase boundaries, durations, scale, instrument, version, nested entries and file size. Imported IDs are regenerated to avoid overwriting existing projects.

The old `chordlab-v1` save is recoverable when no v2 library exists. Its original key is retained. Invalid existing data is reported and never silently overwritten. Writes are explicit; export JSON before clearing browser data or changing devices/origins. The library is local to each browser origin and is not cloud-synchronized.

MIDI uses format 1, 960 PPQN, microseconds-per-quarter-note tempo and the selected time-signature metadata. Shorter phrases repeat to fill one pass of the longer part, with notes clipped at the arrangement end. Note-off events precede note-ons at shared ticks. Same-pitch overlaps on a track merge to avoid early cutoffs. Tracks preserve the full composition length, including silence. Exports estimated above 200,000 note events are rejected before allocating the arrangement. General MIDI program suggestions do not reproduce the app's timbres or sustain pedal gestures.

## Verification

Run `npm test` and `npm run build`. Unit tests cover all twelve keys in both modes, enharmonic spelling, seventh qualities, inversions, migration, rejected files, save/update/delete, transposition, duration timelines, decoded MIDI events, bounded voices, cleanup, scheduler lookahead, looping and cancellation.

For real browser DSP checks, run the dev server and open `/chordlab/docs/audio-check.html`. Press **Run audio verification**. The ten checks render the actual Web Audio graph with `OfflineAudioContext` for all five synth presets and the decoded Grand Piano recordings, checking nonzero finite signal, peak headroom, silent tails, released voices, cancellation before a scheduled onset, and independently extended chord/melody sustain tails. The harness is a developer page, not part of the production bundle.

See [verification notes](docs/VERIFICATION.md) for actual results and remaining device checks. A successful unit test is not a substitute for checking touch behavior or listening on target hardware.

## GitHub Pages

Vite's base path is `/chordlab/`. The Pages workflow installs from the lockfile, runs tests, builds, uploads `dist/`, and deploys through GitHub's Pages action. The separate CI workflow checks pull requests and main-branch changes.

For a fork, change the base path if the repository name changes. Select **Settings → Pages → Build and deployment → Source → GitHub Actions**, then push to `main` or run **Deploy GitHub Pages** manually. The production address for this repository is `https://hosannaute.github.io/chordlab/`.

## Known limitations and next steps

- Physical Android multitouch, device audio latency, speaker quality, Safari/iOS behavior and screen-reader workflows still require target-device testing.
- The Grand Piano is a compact sample bank, with the limitations described above. There is no recording, audio export, MIDI hardware input, velocity editor or effects rack.
- A project has one time signature; mid-song meter changes, swing and triplet grids are not implemented. New melodies start at one bar and extend only when requested, with an absolute ceiling of 128 quarter-note beats. Saved multi-bar melodies remain intact. Chord timelines can be longer; large sessions need profiling on older phones.
- Tempo changes affect future scheduling; held voices retain their existing duration. Preview timbres and pedal gestures are not embedded in MIDI.
- No collaboration or cloud storage. Chord reordering uses accessible move controls; melody notes support pointer dragging as well as editing controls.
- Local save data can be removed by browser cleanup/private mode. JSON exports are the supported backup/transfer mechanism.
- Key choices cover all pitch classes using a practical spelling; there is no separate enharmonic-key selector. Harmonic/melodic-minor palettes remain future additions, though their chromatic chords can be built manually.
- The piano initially shows one octave on phones; its range remains user-selectable. Melody pages normally contain one bar on phones and two on larger displays, capped at 32 columns. Fine grids scroll within the panel and paging preserves the visible beat across layout changes.

Useful next improvements are automatic draft recovery, physical-device regression checks, smoother duration changes during tempo edits, MIDI input and optional offline installation. See [the usability update](docs/USABILITY.md) for the current editing behavior.

## License

Application code: [MIT](LICENSE). Salamander piano recordings: [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), © Alexander Holm; see [sample credits](public/audio/grand-piano/ATTRIBUTION.md). The software license does not relicense the audio.

Technical references: [Web Audio specification](https://webaudio.github.io/web-audio-api/), [Standard MIDI Files](https://midi.org/standard-midi-files), and [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

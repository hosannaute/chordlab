# Verification record

Verified on 27 October 2026 using Node 24 on Windows and the Codex Chromium-based in-app browser. This records evidence, not a claim that every browser/device is bug-free.

## Automated results

- `npm test`: **17 tests passed, 0 failed**.
- `npm run build`: **passed**, with the `/chordlab/` repository base path.
- Production preview at `/chordlab/`: application loaded and composition playback initialized.
- Actual browser `OfflineAudioContext` harness: **6/6 checks passed**. All five instrument presets produced nonzero finite audio, stayed below a peak of 1 for the four-note test chord, ended with silent tails and left no retained voices. Cancelling a future scheduled note rendered silence and released its graph.

The Node audio tests use a fake graph/clock to test independent voices, cleanup, voice limits, lookahead, tempo behavior, duplicate scheduling, loop boundaries and stop-during-initialization. The browser audio harness separately exercises real DSP. Neither measures physical speaker quality or device latency.

## Browser interaction checks

Verified through the actual application controls:

- Add and hear a chord; edit inversion and duration; duplicate and reorder it.
- Start composition playback, observe the active chord, and stop all sound.
- Edit tempo, save, reload, and confirm the tempo persists. This check caught an input-event persistence issue, which was fixed and retested.
- Add a melody note, resize it to two beats and move it half a beat later.
- Rename and save a project, reopen on reload, export JSON, import that JSON and retain the melody.
- Download a real MIDI file; inspect the format-1 header and three-track count. Unit tests additionally decode exact tempo, pitches, durations, event ordering and end-of-track timing.
- Change key and scale and inspect correct F natural-minor seventh-chord labels: Fm7, Gø7, A♭maj7, B♭m7, Cm7, D♭maj7, E♭7.
- Inspect a 390-pixel viewport: no horizontal document overflow was observed before the final touch-target refinements. The final code defaults to a single piano octave and one melody bar per page on phone widths. The browser's viewport override did not apply reliably to the later production tab, so that final compact-mode integration remains to be repeated on a physical phone.
- No warning/error console entries were returned during the verified chord, transport, melody, save/import/export and DSP checks.

The initial browser session stalled around a native progression-replacement confirmation. A fresh production origin loaded and played successfully, and a separate localhost origin completed the real audio harness. Preset-replacement confirmation behavior should be retested outside this automation environment.

## Still to verify manually

- Physical Android multitouch and pointer-cancel behavior, rapid repeated notes, sustained polyphony and device-specific audio latency.
- Safari/iOS audio initialization and interruption behavior.
- Physical-keyboard performance and screen-reader navigation across the full workflow. Semantic controls, roving grid focus and visible focus are implemented; comprehensive assistive-technology QA has not been performed.
- Listening on headphones/speakers; long-duration loop stress, maximum-sized projects and profiling on low-powered hardware.
- MIDI import into external DAWs. File structure/timing are decoded in tests; individual DAW rendering is not verified here.
- Browser UI deletion, malformed-file UI messages and every preset/learning-topic interaction. Their core data/error handling is unit-tested where applicable.

## Reproduce the DSP checks

1. Run `npm ci`, `npm test`, `npm run build`.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:5173/chordlab/docs/audio-check.html` and press **Run audio verification**.
4. Confirm all six checks pass. Use `localhost` instead of `127.0.0.1` if an unrelated modal has stalled that browser origin.

For release/deployment evidence, consult the repository's Test and build and Deploy GitHub Pages workflows; those statuses are separate from the local checks above.

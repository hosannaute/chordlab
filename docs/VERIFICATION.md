# Verification record

## 2.5 one-bar melody and sequenced sustain — 28 October 2026

- Automated checks: **60 tests pass**. All 192 supported meters fit eight equal note positions in one bar, on both layouts. Changing a filled phrase through every meter retains its eight bar-relative positions. Scheduler checks verify gapless note-eight → note-one timing while longer chords continue. Explicit Add bar/Repeat phrase, legacy notes, save/import validation, independent sustain gates, boundary clipping, cancellation, and same-pitch MIDI retriggers are covered.
- Real browser: a new desktop project starts with one bar, eight columns and a one-position note length. Filled eight notes in 4/4, played repeatedly with chords, stopped, saved and reloaded: one bar and independent Short chord / Long melody sustain retained. Add bar created exactly a second page; Undo restored one. Repeat phrase created 16 notes in two bars; editing the first chord afterward survived save/reload.
- Odd meter: 7/8 exposes starts `0, 0.4375, …, 3.0625` quarter beats; eight notes fill one 3.5-quarter bar without another page. Changing a filled bar to 4/4 retains eight positions and one bar.
- Phone frames: 390px and 360px widths show eight positions per bar, usable sustain controls, and document scroll width equal to client width (375px/345px after scrollbars).
- Actual OfflineAudioContext harness: **10/10 checks pass**. Five synths, sampled grand piano, both cancellation checks, and independent chord/melody sustain renders for Soft Piano and Grand Piano. Wet tails contain signal after dry tails become silent; no retained voices. Sampled bank peak 0.0762, 21 files, 96.0 MiB decoded in this browser.
- MIDI now uses 960 PPQN to represent the finest supported eight-position bar exactly. Sustain exports as extended gates; repeated same-pitch attacks remain separate.
- Existing saved multi-bar phrases retain their explicit length. Choose Loop length → 1 bar or Auto to remove unwanted trailing empty bars. No music is silently trimmed.

## Chromatic chords, Sustain and eight-bar phrases (2.4)

Verified on 27 October 2026 with Node 24 on Windows and the Chromium-based in-app browser:

- **54 unit tests pass**, including all roots/qualities/inversions, borrowed-key root spelling, custom chord validation/JSON roundtrip, chromatic transposition, decoded MIDI chord pitches, eight-bar timeline boundaries and retained longer legacy notes. A scheduler test verifies the last note of bar eight ends at the exact next bar-one onset.
- Regressions from the review are covered: cancelling a preview during sample initialization schedules no delayed note; turning Loop off cancels a next-cycle chord already queued by lookahead and can resume scheduling if re-enabled; saving an earlier library project makes it the restored entry.
- Browser controls added F minor, C diminished seventh and C augmented to a C-major session without changing its home key. Transposing to D produced Gm, D°7 and D+; the dim7 third inversion and all custom chords survived save/reload. The inspector spelled the augmented fifth G♯ in C augmented.
- Changing melody loop length followed by a chord-duration edit now retained the first edit (two quarter beats), instead of reverting it. A note placed at bar 8's final half-beat used a half-beat duration, with the last page 7–8 on desktop; Next and Add bar were disabled. A meter change that would push that note beyond eight bars was rejected without deleting it.
- At real 390/360 pixel iframe widths, document scroll width equaled body width (375/345 after scrollbar). The phone melody page list ended at 8. Sustain remained visible above collapsed sound settings, spanned the piano panel width, toggled On, and returned Off with Stop.
- Browser save/reload restored the most recently saved earlier project (Chromatic A at 120 BPM), retaining borrowed/custom chords and the eight-bar loop. No warnings/errors were returned from that desktop test tab.
- **8/8 real audio checks passed** after the cancellation changes: all five synth presets, future onset cancellation, all 21 decoded Grand Piano recordings, and sampled onset cancellation. The sampled chord peak was 0.0762, release tails were silent and no voices remained. The decoded bank used 96.0 MiB in the tested browser.

Sustain is a live-keyboard pedal; automatic sequencer pedal events are not implemented. Existing longer legacy phrases are retained rather than trimmed. Physical phone and Safari/iOS checks remain outstanding. See [CHORDS.md](CHORDS.md).

## Meter and continuous melody update (2.3)

Verified on 27 October 2026 with Node 24 on Windows and the Chromium-based in-app browser:

- **44 unit tests passed** and the production build passed. Meter/grid tests cover every supported numerator 1–32 with denominators 1, 2, 4, 8, 16 and 32. Scheduler tests check exact independent phrase onsets in 3/4, 6/8, 7/8, 5/16 and 3/32, sorted notes after out-of-order editing, a longer melody over repeating chords, loop-off during a later pass, and cancellation. MIDI tests decode meter metadata, repeated short-phrase note ticks, arrangement endings and the bounded-export rejection.
- Through the actual app controls, created **16 melody notes in 7/8**, repeated them into **32 editable notes**, and undid the repeat. A request to shorten the loop below the last note was rejected without losing notes. Save/reload preserved meter, all sixteen notes, 120 BPM and a fine enough grid to edit them.
- Actual composition playback stayed running beyond the original pass. The melody playhead continued using its two-bar loop while the four-bar chord progression advanced independently. In a real phone-width iframe, melody-only playback automatically followed into the second bar and scrolled the playhead horizontally. Stop reset playback.
- Add bar selected the new bar and set an explicit three-bar phrase; Undo restored the original automatic two-bar melody. Previous/Next remained functional. At 360 and 390 pixel iframe widths, document scroll width equaled body width (345 and 375 after scrollbar). The fine melody grid scrolled inside its own viewport (494 pixels of content within 281 or 311 pixels) rather than widening the document.
- The compiled production preview additionally created a sixteen-note **6/8** phrase with a two-bar explicit loop, loaded the real Grand Piano recordings and started combined playback.
- The phone automation session logged the same injected MutationObserver error seen during prior focused-grid replacement checks. No application source uses MutationObserver; this session is therefore not described as an error-free console run.

These checks do not replace physical phone, Safari/iOS, speaker/latency or assistive-technology testing. Existing audio-engine DSP evidence is retained below; this update changes timeline scheduling and editing, not the sampled/synthesized voice graphs. See [TIMING.md](TIMING.md) for quarter-note tempo semantics and the supported meter/timeline limits.

## Grand Piano and looping update (2.2)

Verified on 27 October 2026 with Node 24 on Windows and the Chromium-based in-app browser:

- **34 unit tests passed**, including default repeated chord-and-melody passes, melody-only looping, sample pitch mapping, concurrent load/cache behavior, failed-load retries, sampled voice cleanup and SHA-256 verification of all 21 bundled recordings.
- **Production build passed** with the repository base path and self-hosted sample bank.
- **8/8 real browser audio checks passed.** All five synth presets passed their existing signal/headroom/tail/cleanup checks. All 21 real MP3 recordings decoded successfully. The sampled four-note test rendered a finite nonzero signal (peak 0.0762), a silent release tail and no retained voices. Cancelling a sampled note before its onset rendered silence and released its graph.
- The decoded bank occupied **96.0 MiB** at 44.1 kHz in the tested browser; the compressed recordings total 1,355,324 bytes. Device sample rates can change decoded memory use.
- Actual UI playback stayed running beyond the composition's first pass, with an advancing chord highlight. Melody-only playback also stayed running across repeated passes. Stop reset transport state. Sample-loading progress and the ready message appeared; switching to Soft Piano and back remained available.
- At real iframe widths **390 and 360 pixels**, document scroll width equaled body width (375 and 345 respectively after scrollbar). All five fixed phone controls fit. The phone Loop button updated both loop controls; Stop returned the transport to its stopped state.
- No warning/error console entries were returned from the sampled-piano UI test tab. The browser DSP test initially caught an unbound native fetch call; the loader was corrected and the full eight-check harness passed afterward.

These checks render the actual browser audio graph but do not assess subjective sound quality through speakers, physical phone performance or Safari/iOS compatibility. The bank is a compact single-layer selection of acoustic recordings, not the complete Salamander instrument.

## Usability update

The follow-up usability pass passes **26 unit tests** and a production build. Browser checks used an authored iframe harness with real frame widths, avoiding the unreliable host viewport override from the initial release.

Verified through the application controls: clearing/restoring chords and melody; keyboard undo; pointer dragging from C4 at beat 1 to D4 at beat 2; dragging the right edge from one to two beats; one-step undo/redo of that resize; undoing transposition to the saved project with a cleared unsaved marker; and replacing the progression with ii–V–I and restoring the original without a confirmation dialog. Responsive checks at 390, 360 and 1200 pixels preserve the current melody bar and report no horizontal document overflow. A 390-pixel frame starts with 13 piano keys, 8 scale-note rows and 8 timeline columns. Physical touch hardware is still unverified.

The harness is `docs/responsive-check.html` (serve with `npm run dev`). Its iframe height fits the available browser window so the fixed mobile playback controls are reachable during automation. During the automation session, one injected MutationObserver error was logged; the application source does not use MutationObserver. Remaining browser checks and production verification are recorded separately from that automation instrumentation error.

The compiled production preview additionally passed mobile Play/Stop, keyboard Delete followed by Undo, and a four-note melody check at phone width. Its phone screenshot is in `docs/screenshots/mobile-editor.jpg`. An automation-injected MutationObserver error also appeared after replacing focused DOM cells; no application module or runtime dependency uses MutationObserver. This is retained here rather than presenting the session as an error-free console run.

The original release results below are retained as historical evidence; the synthesis engine was not changed in this usability pass.

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
4. Confirm all eight checks pass. Use `localhost` instead of `127.0.0.1` if an unrelated modal has stalled that browser origin.

For release/deployment evidence, consult the repository's Test and build and Deploy GitHub Pages workflows; those statuses are separate from the local checks above.

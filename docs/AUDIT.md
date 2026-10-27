# Initial audit and implementation plan

The starting point (af1ad08) contains one HTML file and a short README. The app already generates seven diatonic triads, plays a progression, accepts piano clicks/keyboard input, saves one sequence, and exports format-0 MIDI. Preserve those concepts and the existing `chordlab-v1` data.

## Findings

- Triad pitch classes are correct, but all labels use sharps even in flat keys. Chord registers are reconstructed after losing octave information.
- Piano notes always decay after 0.4 seconds; pointer release, multitouch ownership, sustain and keyboard release are missing.
- Audio context resume is not awaited. Every progression is scheduled up front, preventing live tempo and loop control. Stop abruptly cuts voices.
- One local save slot has limited validation; failed reads are silently swallowed and writes can throw.
- MIDI contains one track and fixed chord lengths. There are no tests, inversion controls, melody editor, separate tracks, or project import/export.
- Controls have labels but active piano state, focus, transport status and mobile interactions need improvement.
- README states MIT but no license file exists. No production build or automated deployment exists.

## Staged plan

1. Extract theory and project validation, migrate legacy storage without deleting the source, and test musical/data invariants.
2. Replace fixed notes with managed voices and a bounded lookahead scheduler. Improve the progression workspace and touch/keyboard piano.
3. Add inversions/sevenths, editable durations, melody grid, multiple projects, validated JSON and synchronous multitrack MIDI.
4. Verify small-screen layout, accessible editing alternatives, focus, lifecycle cleanup and learning examples.
5. Run unit/browser/production checks, document limitations, add MIT and GitHub Pages CI, publish a development branch and PR.

Vanilla ES modules plus Vite retain the small existing application and avoid a framework migration without a clear benefit. Node's built-in test runner adds no test runtime dependency.

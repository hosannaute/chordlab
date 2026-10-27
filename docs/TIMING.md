# Melody phrases, meter and synchronization

CHORDLAB 2.3 gives harmony and melody separate loop lengths on one audio clock. A short melody repeats during the chord progression instead of playing once and waiting for the longest part to restart.

**2.4 update:** new melody phrases default to eight bars and the editor cannot append an empty ninth bar. Add bar/Repeat phrase stop at that limit; the older 128-quarter-note capacity described below is now a compatibility ceiling for preserved legacy projects and unusually large meters. Meter changes that would push notes beyond the current phrase limit are rejected. See [CHORDS.md](CHORDS.md) for the current behavior.

## Using the controls

1. Set **Time signature** in the session strip. The numerator accepts 1–32; the denominator accepts 1, 2, 4, 8, 16 or 32. There is one meter per project.
2. Choose **One bar per chord** if the existing chord lengths should follow the new meter. Changing meter alone preserves their timing. New chords and progression presets use one selected-meter bar per chord.
3. Add melody notes. **Auto · whole bars** repeats through the final occupied bar; an explicit loop length includes intentional rests and must contain all existing notes.
4. Choose **Grid → 1/16 notes** or **1/32 notes** for more positions within a bar, with a corresponding note length. Grid spacing and note count are independent: eight visible positions are not an eight-note project limit.
5. **＋ Add bar** extends the loop and moves the view to the new bar. **×2 Repeat phrase** copies the current phrase into a doubled, editable phrase. Both are undoable.
6. Previous/Next reaches other pages. Fine grids scroll within their own panel on phones. **Follow playback** follows pages and the horizontal playhead while listening; disable it to inspect another location.

Up to 512 melody notes fit within the last complete bar at or before 128 quarter-note beats. This is 32 bars in 4/4 or 36 bars in 7/8. Pitch range remains MIDI 36–95. Grid pages contain at most 32 columns, keeping very large custom bars bounded. Imported older version-2 projects retain their notes and instrument and receive 4/4 with automatic melody length.

## How the loops line up

The stored beat and BPM unit is a **quarter note**. Bar duration in quarter beats is `numerator × 4 / denominator`. At 120 BPM, a 6/8 bar occupies 3 quarter beats and lasts 1.5 seconds; a 7/8 bar occupies 3.5 quarter beats and lasts 1.75 seconds. The grid ruler shows bar:beat positions in the selected denominator's units.

Both parts start from the same audio-clock anchor. The scheduler maintains a sorted event list and cursor for each part and places its next cycle at an exact multiple of that part's duration. A one-bar melody repeats four times during a four-bar chord progression. A two-bar melody repeats twice. If the melody is longer, chords keep repeating underneath it.

Different non-divisible lengths remain on the same tempo grid, but their starts meet less often: a three-bar melody over four bars of chords meets the chord start again after twelve bars. No stretching, tempo drift correction or large least-common-multiple event list is needed. Select equal or divisible bar counts for recurring shared boundaries.

Loop off finishes one arrangement spanning the longer part; when disabled during later playback, it finishes the current arrangement pass. Shorter phrases repeat to fill that pass. Stop cancels both parts immediately through the existing managed audio engine. Editing stops the transport, and background/blur behavior remains unchanged.

## Persistence and export

Optional `meter: { numerator, denominator }` and `melodyBars` fields extend the version-2 project schema. A zero `melodyBars` means automatic whole-bar length. New fields survive save/reload, JSON import/export and undo/redo. Starts use eighths of a quarter note (1/32 notes); supported durations are 1/32, 1/16, 1/8, 1/4, 1/2 and whole notes. Shorter-loop requests never delete or conceal existing notes.

MIDI uses the selected time-signature meta event and a quarter-note tempo at 480 PPQN. It exports one pass of the longer part and repeats the shorter phrase, clipping notes at the arrangement end. An estimate above 200,000 note events is rejected before expansion. App timbres and infinite playback are not embedded in MIDI.

Swing, triplets, mid-song meter changes and automatic accent/metronome patterns are outside this update.

## References and verification

The distinction between meter/grid and absolute timing follows [Apple's Logic Pro time-signature documentation](https://support.apple.com/en-il/guide/logicpro/lgcpce102b95/10.7/mac/11.0): tempo remains quarter-note based even for eighth-note denominators. Explicit phrase regions and independent loop lengths follow the approach documented in [Ableton's clip and loop controls](https://www.ableton.com/en/manual/clip-view/). These are design references; CHORDLAB uses its own Web Audio scheduler.

Unit tests cover all supported numerator/denominator combinations, chronological scheduling after out-of-order edits, simultaneous independent cycles in 3/4, 6/8, 7/8, 5/16 and 3/32, later loop-off, stop, more than eight notes, 512-note limits, preserved rests, older-save defaults and decoded MIDI meter/ticks. Actual browser and device limitations are recorded in [VERIFICATION.md](VERIFICATION.md).

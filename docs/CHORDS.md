# Borrowed chords, dim/aug and the keyboard pedal

## Add harmony outside the home key

The session **Key / Scale** remains the home key. **Borrow from** changes only the chord palette: pick any of the twelve keys and major or natural minor, then add its triads or seventh chords. Selecting C minor while the home key is C major supports parallel-mode borrowing. Selecting another key supports passing harmony without transposing the rest of the composition.

**Build any chord** offers any root and nine qualities: major, minor, diminished, augmented, dominant seventh, major seventh, minor seventh, fully diminished seventh and half-diminished seventh. Choose a short length such as **1/8 note · passing**, preview it, then add it. Added chord cards retain their own duration, inversion, duplicate, move and remove controls.

Diminished triads use `[0,3,6]`; augmented triads use `[0,4,8]`; fully diminished sevenths use `[0,3,6,9]`. Fully diminished and half-diminished sevenths are separate choices. Chord spelling preserves stacked thirds: C augmented displays C–E–G♯; C diminished seventh displays C–E♭–G♭–B♭♭. Borrowed chords use their source key's root spelling, so borrowing C♯ minor from A major retains C♯m.

Changing the session key transposes custom roots and borrowing-key metadata by the same semitone shift as the melody. Changing major/minor preserves the selected custom qualities; ordinary diatonic cards continue to follow the home scale. The inspector identifies a custom/source chord and describes chromatic color without claiming that every borrowed chord has one fixed harmonic function.

Custom cards use optional `type: "custom"`, `root`, `quality`, `beats`, `inversion`, and optional `sourceKey`/`sourceMode` fields in the version-2 schema. Existing diatonic cards retain their degree representation. Validation rejects unknown qualities, invalid roots/sources and unsupported inversions. Playback and MIDI use one shared chord resolver, so chromatic notes survive save/reload, JSON roundtrips and MIDI export.

## Find Sustain

**Sustain: Off / On** is beside the piano heading, above the sound-settings disclosure. On phones it is a full-width control. Click/tap to latch it; holding Space also holds the pedal when focus is outside a text field or button. Stop and background/blur cleanup release the pedal and held voices.

This pedal sustains notes played on the live keyboard. It does not add automatic pedal events to the chord/melody sequencer or MIDI export.

## Eight musical bars

New melody phrases start at eight bars. The editor and loop-length choices stop at eight, Add bar cannot append a ninth, and Repeat phrase cannot double eight into sixteen. A note at the last position fits inside the current final bar. Existing shorter loops remain available; a meter change cannot silently push notes into a ninth bar.

Older imported/saved phrases already longer than eight bars remain intact. Their existing limit is shown explicitly rather than trimming stored music. No new ninth bar is introduced into an eight-bar project. The absolute compatibility ceiling is still 128 quarter-note beats; very large meters may fit fewer than eight bars.

The timing tests confirm that the last note of bar eight meets the next bar-one onset exactly on the scheduler's audio clock. Musical phrase boundaries remain separate from the number of grid cells or notes.

Theory reference: [Open Music Theory: triads](https://viva.pressbooks.pub/openmusictheory/chapter/triads/) and [triads/seventh chords](https://open-musictheory.github.io/docs/fundamentals/triads/).

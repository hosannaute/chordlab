# Borrowed chords, dim/aug and the keyboard pedal

## Add harmony outside the home key

The session **Key / Scale** remains the home key. **Borrow from** changes only the chord palette: pick any of the twelve keys and major or natural minor, then add its triads or seventh chords. Selecting C minor while the home key is C major supports parallel-mode borrowing. Selecting another key supports passing harmony without transposing the rest of the composition.

**Build any chord** offers any root and nine qualities: major, minor, diminished, augmented, dominant seventh, major seventh, minor seventh, fully diminished seventh and half-diminished seventh. Choose a short length such as **1/8 note · passing**, preview it, then add it. Added chord cards retain their own duration, inversion, duplicate, move and remove controls.

Diminished triads use `[0,3,6]`; augmented triads use `[0,4,8]`; fully diminished sevenths use `[0,3,6,9]`. Fully diminished and half-diminished sevenths are separate choices. Chord spelling preserves stacked thirds: C augmented displays C–E–G♯; C diminished seventh displays C–E♭–G♭–B♭♭. Borrowed chords use their source key's root spelling, so borrowing C♯ minor from A major retains C♯m.

Changing the session key transposes custom roots and borrowing-key metadata by the same semitone shift as the melody. Changing major/minor preserves the selected custom qualities; ordinary diatonic cards continue to follow the home scale. The inspector identifies a custom/source chord and describes chromatic color without claiming that every borrowed chord has one fixed harmonic function.

Custom cards use optional `type: "custom"`, `root`, `quality`, `beats`, `inversion`, and optional `sourceKey`/`sourceMode` fields in the version-2 schema. Existing diatonic cards retain their degree representation. Validation rejects unknown qualities, invalid roots/sources and unsupported inversions. Playback and MIDI use one shared chord resolver, so chromatic notes survive save/reload, JSON roundtrips and MIDI export.

## Find Sustain

**Sustain: Off / On** is beside the piano heading, above the sound-settings disclosure. On phones it is a full-width control. Click/tap to latch it; holding Space also holds the pedal when focus is outside a text field or button. Stop and background/blur cleanup release the pedal and held voices.

This pedal sustains notes played on the live keyboard. For sequenced parts, use **Chord sustain** in the progression panel and **Melody sustain** above the melody grid. Each has Off / Short / Medium / Long settings, adding 0 / 0.5 / 1 / 2 quarter-note beats of hold after the written length. Settings are independent, saved with the project, undoable, and included in MIDI as extended note gates. Each part clears its sustained notes at its own phrase boundary, and Stop cancels both parts.

The track mixer also offers a separate **Pedal part / Bar / Hold pedal in this bar** editor. Consecutive pedal-down bars sustain into the next pedal-up bar, with a reset at the phrase boundary. Repeat phrase copies the melody pedal pattern. These events are included as CC64 in MIDI and as held note gates in WAV.

## Eight note positions in one musical bar

New melody phrases start at **one bar**, with **eight equally spaced note positions** on phones and desktop. Fill those positions and the melody returns immediately from position eight to position one on the next bar. In 4/4 they are eighth notes; other time signatures divide their own bar evenly into eight positions. Rests are the positions you leave empty.

**Add bar** adds one more complete bar and opens it for editing. **Repeat phrase** doubles the current phrase with editable copies of its notes. Page choices include only the current phrase, so no empty second or ninth bar is introduced automatically. An optional 16/32-position grid allows finer subdivisions. The absolute timeline remains 128 quarter-note beats with up to 512 melody notes.

Existing saved longer phrases stay intact. To reduce a previously saved eight-bar phrase with notes only in bar one, choose **Loop length → 1 bar** or **Auto · whole bars**. Shortening is rejected if it would hide any notes.

Theory reference: [Open Music Theory: triads](https://viva.pressbooks.pub/openmusictheory/chapter/triads/) and [triads/seventh chords](https://open-musictheory.github.io/docs/fundamentals/triads/).

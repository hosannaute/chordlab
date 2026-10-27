# ChordLab 🎹

**Make music make sense.** A mobile-friendly music theory and chord progression playground.

## Features
- Build progressions from diatonic triads in all 12 keys
- Major and natural minor scales with Roman numeral chord labels
- Play progressions using the Web Audio API with three waveforms
- Adjustable tempo, interactive piano, keyboard controls
- Three progression presets and explanatory chord notes
- Save settings and sequences locally in the browser
- Export MIDI (format 0)

## Try it
Open `index.html` in a modern browser. No installation, backend, account or API key required.

## Publish with GitHub Pages
Go to **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/(root)`, then Save.

## How it works
Chord tones are calculated by stacking thirds within the selected scale. Web Audio oscillators schedule playback; MIDI export encodes tempo, note events and variable-length delta times. All data stays on your device.

## Future improvements
Chord inversions, seventh chords, drag-and-drop ordering, looping and more instruments.

## License
MIT.

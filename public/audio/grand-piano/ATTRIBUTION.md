# Salamander Grand Piano recordings

**Author:** Alexander Holm  
**Instrument:** Yamaha C5 grand piano  
**License:** Creative Commons Attribution 3.0 Unported (CC BY 3.0)  
**License link:** https://creativecommons.org/licenses/by/3.0/  
**Legal code:** https://creativecommons.org/licenses/by/3.0/legalcode

Original collection: https://archive.org/details/SalamanderGrandPianoV3  
Project and author/license information: https://github.com/sfzinstruments/SalamanderGrandPiano  
MP3 distribution: https://github.com/Tonejs/audio/tree/efd8296360f9526e379bfbe5c1698ff54d6a1d34/salamander

CHORDLAB bundles 21 unmodified MP3 files from the Tone.js distribution, spanning C2–C7 in minor thirds. The upstream README is retained as `SOURCE-README.txt`; it labels the collection V2 and includes a V3 changelog. File hashes and the exact source revision are recorded in `manifest.json`.

Compact mode uses the 21-file single-layer subset above. CHORDLAB repitches neighboring notes, normalizes playback gain, and applies velocity and attack/release envelopes.

## Optional expressive soft/hard pack

The `layers/` folder adds **42 recordings**: 21 pitches from velocity layer v4 (soft) and 21 from v12 (hard), from Alexander Holm's original recordings as distributed by sfzinstruments/SalamanderGrandPiano at commit `3382bf9496bba2486f5ab0de55a264d1dfc38404`. Source: https://github.com/sfzinstruments/SalamanderGrandPiano/tree/3382bf9496bba2486f5ab0de55a264d1dfc38404/Samples . The SFZ mapping and onset offsets are from that repository's `Data/region.txt` and `Data/vel_04.txt` / `Data/vel_12.txt` (SFZ remapping by kinwie).

**Modifications:** CHORDLAB applies the SFZ onset offset, retains up to 12 seconds, converts to mono 22,050 Hz MP3 at 64 kbps, and applies a 0.5-second fade at the 12-second boundary. Source and derived-file SHA-256 hashes, the original names, source revision, offsets and conversion settings are recorded in `layers/manifest.json`. The reproducible conversion script is `scripts/build-piano-layers.py`; it requires FFmpeg. The optional pack totals 3,511,595 compressed bytes and is loaded only when Expressive piano is enabled.

This is a two-layer adaptation, not the full 16-layer SFZ instrument. Hammer/pedal noises and sympathetic resonance recordings are not included. The derived recordings remain CC BY 3.0 with the same author attribution.

The samples remain under CC BY 3.0 and are not relicensed under CHORDLAB's MIT software license. Credit does not imply endorsement by Alexander Holm or the Tone.js project.

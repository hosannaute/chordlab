export const KEYS = [
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "F♯",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
];
export const INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  halfdim7: [0, 3, 6, 10],
};
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const ROMAN = {
  major: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  minor: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
};
const SUFFIX = {
  major: "",
  minor: "m",
  diminished: "°",
  augmented: "+",
  maj7: "maj7",
  min7: "m7",
  dom7: "7",
  halfdim7: "ø7",
};
export const mod = (n, m = 12) => ((n % m) + m) % m;
export const pitchName = (note) => KEYS[mod(note)];
export const transpose = (notes, semitones) => notes.map((n) => n + semitones);
export function scale(root, mode = "major") {
  if (!Number.isInteger(root) || root < 0 || root > 11 || !SCALES[mode])
    throw new Error("Invalid key or scale");
  return SCALES[mode].map((n) => mod(n + root));
}
export function scaleNames(root, mode) {
  const first = LETTERS.indexOf(KEYS[root][0]);
  return scale(root, mode).map((pitch, i) => {
    const letter = (first + i) % 7;
    const alteration = mod(pitch - NATURAL[letter] + 6) - 6;
    return (
      LETTERS[letter] +
      (alteration > 0 ? "♯".repeat(alteration) : "♭".repeat(-alteration))
    );
  });
}
export function invert(notes, inversion = 0) {
  if (
    !Number.isInteger(inversion) ||
    inversion < 0 ||
    inversion >= notes.length
  )
    throw new Error("Invalid inversion");
  return [
    ...notes.slice(inversion),
    ...notes.slice(0, inversion).map((n) => n + 12),
  ];
}
export function buildChord(root, quality, inversion = 0) {
  if (!INTERVALS[quality]) throw new Error("Unknown chord quality");
  return invert(
    INTERVALS[quality].map((n) => root + n),
    inversion,
  );
}
export function diatonicChord(
  root,
  mode,
  degree,
  seventh = false,
  inversion = 0,
) {
  if (!Number.isInteger(degree) || degree < 0 || degree > 6)
    throw new Error("Invalid scale degree");
  scale(root, mode);
  const s = SCALES[mode];
  const offsets = (seventh ? [0, 2, 4, 6] : [0, 2, 4]).map(
    (n) => s[(degree + n) % 7] + 12 * Math.floor((degree + n) / 7),
  );
  const intervals = offsets.map((n) => n - offsets[0]);
  const quality = Object.keys(INTERVALS).find(
    (q) => INTERVALS[q].join() === intervals.join(),
  );
  const names = scaleNames(root, mode);
  let roman = ROMAN[mode][degree];
  if (seventh)
    roman =
      quality === "halfdim7"
        ? roman.replace("°", "ø7")
        : roman + (quality === "maj7" ? "maj7" : "7");
  return {
    name: names[degree] + SUFFIX[quality],
    quality,
    roman,
    notes: invert(
      offsets.map((n) => 48 + root + n),
      inversion,
    ),
    names: (seventh ? [0, 2, 4, 6] : [0, 2, 4]).map(
      (n) => names[(degree + n) % 7],
    ),
    intervals,
    degree,
  };
}
export function describeChord(chord, mode) {
  const d = chord.degree;
  if (d === 0)
    return "Tonic · Your home chord. It establishes the key and gives a sense of arrival.";
  if (d === 3 || d === 1)
    return "Predominant · Often moves the music away from home and toward the dominant.";
  if (d === 4)
    return mode === "minor"
      ? "Minor dominant · A gentler pull toward home. Natural minor uses v; harmonic minor raises the seventh to create V."
      : "Dominant · Contains the leading tone, creating tension that often resolves to the tonic.";
  if (d === 6)
    return mode === "major"
      ? "Leading-tone chord · Its diminished fifth creates tension that often resolves to the tonic."
      : "Subtonic · Sits a whole step below home and gives natural minor its open, modal sound.";
  return "Color chord · Shares notes with nearby chords and offers a softer change of direction.";
}

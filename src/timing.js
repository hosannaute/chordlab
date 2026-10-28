// All stored times and BPM use quarter notes, independently of meter.
export const MAX_BEATS = 128;
// Eight equal positions must fit even the shortest supported bar (1/32).
export const MIN_STEP = 1 / 64;
export const NOTE_LENGTHS = [0.125, 0.25, 0.5, 1, 2, 4];
export const DENOMINATORS = [1, 2, 4, 8, 16, 32];
export function meterOf(project) {
  return project.meter ?? { numerator: 4, denominator: 4 };
}
export function barBeats(project) {
  const { numerator, denominator } = meterOf(project);
  return (numerator * 4) / denominator;
}
export function timelineEnd(project) {
  const bar = barBeats(project);
  return phraseBarLimit(project) * bar;
}
export function phraseBarLimit(project) {
  return Math.floor(MAX_BEATS / barBeats(project));
}
export function melodyLength(project) {
  if (!project.melody.length && !project.melodyBars) return 0;
  const bar = barBeats(project);
  const end = Math.max(0, ...project.melody.map((n) => n.start + n.beats));
  return Math.max(bar, (project.melodyBars || Math.ceil(end / bar)) * bar);
}
export function positionLabel(beat, project) {
  const bar = barBeats(project),
    unit = 4 / meterOf(project).denominator;
  return `${Math.floor(beat / bar) + 1}:${Number(((beat % bar) / unit + 1).toFixed(3))}`;
}
export function validNoteLength(beats) {
  return (
    Number.isFinite(beats) &&
    beats >= MIN_STEP &&
    beats <= MAX_BEATS &&
    Number.isInteger(beats / MIN_STEP)
  );
}
export function noteLengths(project) {
  const bar = barBeats(project);
  return [
    ...new Set([
      ...[32, 16, 8, 4, 2, 1].map((steps) => bar / steps),
      ...(project.melody || []).map((note) => note.beats),
    ]),
  ]
    .filter(validNoteLength)
    .sort((a, b) => a - b);
}
export function gridLayout(project, compact, requestedSteps = 8) {
  const bar = barBeats(project);
  let step = bar / requestedSteps;
  // Preserve and reveal off-grid notes in older saves without moving their timing.
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let units = Math.round(step / MIN_STEP);
  for (const note of project.melody || []) {
    units = gcd(units, Math.round(note.start / MIN_STEP));
    units = gcd(units, Math.round(note.beats / MIN_STEP));
  }
  step = Math.max(MIN_STEP, units * MIN_STEP);
  const columns = Math.min(32, Math.round(bar / step));
  const span = columns * step;
  return {
    step,
    columns,
    span,
    pages: Math.ceil(
      Math.max(
        bar,
        melodyLength({ ...project, melody: project.melody || [] }),
      ) / span,
    ),
  };
}

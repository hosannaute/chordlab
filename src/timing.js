// All stored times and BPM use quarter notes, independently of meter.
export const MAX_BEATS = 128;
export const MIN_STEP = 0.125;
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
  const bar = barBeats(project);
  // Keep longer legacy compositions intact, but never create an empty ninth bar.
  const occupied = Math.ceil(
    Math.max(
      0,
      ...(project.melody || []).map((note) => note.start + note.beats),
    ) / bar,
  );
  return Math.min(
    Math.floor(MAX_BEATS / bar),
    Math.max(8, project.melodyBars || 0, occupied),
  );
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
export function gridLayout(project, compact, requestedStep = 0.5) {
  const step = Math.min(requestedStep, 4 / meterOf(project).denominator);
  const bar = barBeats(project);
  const columns = Math.min(32, Math.round(bar / step) * (compact ? 1 : 2));
  const span = columns * step;
  return { step, columns, span, pages: Math.ceil(timelineEnd(project) / span) };
}

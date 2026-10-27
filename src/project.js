import { diatonicChord, mod } from './theory.js';
export const INSTRUMENTS = ['soft-piano', 'electric-piano', 'synth-pad', 'plucked-synth', 'organ'];
export const newProject = () => ({ version: 2, id: crypto.randomUUID(), name: 'Untitled session', key: 0, mode: 'major', tempo: 100, instrument: 'soft-piano', progression: [0, 4, 5, 3].map(degree => ({ degree, beats: 4, inversion: 0, seventh: false })), melody: [] });
const number = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const integer = (v, min, max) => Number.isInteger(v) && number(v, min, max);
export function validateProject(p) {
  if (!p || p.version !== 2 || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || !integer(p.key, 0, 11) || !['major', 'minor'].includes(p.mode) || !integer(p.tempo, 40, 220) || !INSTRUMENTS.includes(p.instrument)) throw new Error('This is not a compatible CHORDLAB project.');
  if (!Array.isArray(p.progression) || p.progression.length > 128 || !Array.isArray(p.melody) || p.melody.length > 512) throw new Error('Project exceeds the supported size.');
  const progression = p.progression.map(c => {
    if (!c || !integer(c.degree, 0, 6) || ![0.5, 1, 2, 4, 8].includes(c.beats) || typeof c.seventh !== 'boolean' || !integer(c.inversion, 0, c.seventh ? 3 : 2)) throw new Error('Invalid chord in project.');
    return { degree: c.degree, beats: c.beats, seventh: c.seventh, inversion: c.inversion };
  });
  const melody = p.melody.map(n => {
    if (!n || !integer(n.pitch, 36, 95) || !number(n.start, 0, 127.5) || n.start * 2 % 1 || ![0.5, 1, 2, 4].includes(n.beats) || n.start + n.beats > 128) throw new Error('Invalid melody note in project.');
    return { pitch: n.pitch, start: n.start, beats: n.beats };
  });
  const id = typeof p.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(p.id) ? p.id : crypto.randomUUID();
  return { version: 2, id, name: p.name.trim(), key: p.key, mode: p.mode, tempo: p.tempo, instrument: p.instrument, progression, melody };
}
export function migrateLegacy(old) {
  if (!old || !Array.isArray(old.sequence) || old.sequence.length > 128 || !old.sequence.every(d => integer(d, 0, 6))) throw new Error('Invalid legacy progression.');
  return validateProject({ ...newProject(), id: 'legacy-recovered', name: 'Recovered progression', key: Number(old.key), mode: old.mode, tempo: Number(old.tempo), instrument: { sine: 'soft-piano', triangle: 'electric-piano', sawtooth: 'plucked-synth' }[old.wave] || 'soft-piano', progression: old.sequence.map(degree => ({ degree, beats: 4, inversion: 0, seventh: false })) });
}
export function transposeProject(project, key) {
  let distance = mod(key - project.key + 6) - 6;
  const melody = project.melody.map(n => ({ ...n, pitch: n.pitch + distance }));
  if (melody.some(n => n.pitch < 36 || n.pitch > 95)) throw new Error('Transposition would move a melody note outside the supported range.');
  return { ...project, key, melody };
}
export function composition(project, part = 'all') {
  const events = [];
  let cursor = 0;
  project.progression.forEach((c, index) => {
    if (part !== 'melody') diatonicChord(project.key, project.mode, c.degree, c.seventh, c.inversion).notes.forEach(pitch => events.push({ pitch, start: cursor, beats: c.beats, track: 'chords', index }));
    cursor += c.beats;
  });
  if (part !== 'chords') project.melody.forEach(n => events.push({ ...n, track: 'melody' }));
  const total = Math.max(part === 'melody' ? 0 : cursor, ...events.map(e => e.start + e.beats), 0);
  return { events: events.sort((a, b) => a.start - b.start), beats: total };
}

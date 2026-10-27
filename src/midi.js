import { composition, validateProject } from './project.js';
const text = value => [...new TextEncoder().encode(value)];
const word = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
export function vlq(n) {
  if (!Number.isInteger(n) || n < 0 || n > 0x0fffffff) throw new Error('Invalid MIDI delta time');
  const bytes = [n & 127];
  while (n >>= 7) bytes.unshift((n & 127) | 128);
  return bytes;
}
function track(name, events, end) {
  const nameBytes = text(name);
  const bytes = [0, 255, 3, ...vlq(nameBytes.length), ...nameBytes];
  let previous = 0;
  events.sort((a, b) => a.tick - b.tick || a.priority - b.priority).forEach(e => {
    bytes.push(...vlq(e.tick - previous), ...e.bytes); previous = e.tick;
  });
  bytes.push(...vlq(Math.max(0, end - previous)), 255, 47, 0);
  return [...text('MTrk'), ...word(bytes.length), ...bytes];
}
export function exportMidi(project) {
  validateProject(project);
  const { events, beats } = composition(project);
  const tempo = Math.round(60000000 / project.tempo);
  const end = Math.round(beats * 480);
  const tracks = [track('Tempo', [{ tick: 0, priority: 0, bytes: [255, 81, 3, tempo >>> 16, (tempo >>> 8) & 255, tempo & 255] }, { tick: 0, priority: 1, bytes: [255, 88, 4, 4, 2, 24, 8] }], end)];
  ['chords', 'melody'].forEach((part, channel) => {
    const notes = events.filter(e => e.track === part);
    if (!notes.length) return;
    // Merge overlapping identical pitches on a track so a note-off cannot cut another voice short.
    const merged = [];
    notes.sort((a, b) => a.pitch - b.pitch || a.start - b.start).forEach(n => {
      const last = merged.at(-1);
      if (last && last.pitch === n.pitch && n.start < last.start + last.beats) last.beats = Math.max(last.beats, n.start + n.beats - last.start);
      else merged.push({ ...n });
    });
    const messages = [{ tick: 0, priority: 0, bytes: [192 + channel, part === 'chords' ? 0 : 4] }];
    merged.forEach(n => messages.push({ tick: Math.round(n.start * 480), priority: 2, bytes: [144 + channel, n.pitch, part === 'chords' ? 78 : 96] }, { tick: Math.round((n.start + n.beats) * 480), priority: 1, bytes: [128 + channel, n.pitch, 0] }));
    tracks.push(track(part === 'chords' ? 'Chords' : 'Melody', messages, end));
  });
  return new Uint8Array([...text('MThd'), ...word(6), 0, 1, 0, tracks.length, 1, 224, ...tracks.flat()]);
}

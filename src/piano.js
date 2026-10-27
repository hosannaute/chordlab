import { pitchName, mod } from './theory.js';
export class Piano {
  constructor(element, audio, report) {
    this.element = element; this.audio = audio; this.report = report; this.held = new Map(); this.sustained = new Set(); this.sustain = false; this.octave = 4; this.octaves = 2; this.labels = true;
    const release = e => this.release('pointer-' + e.pointerId);
    element.addEventListener('pointerup', release); element.addEventListener('pointercancel', release); element.addEventListener('lostpointercapture', release);
    element.addEventListener('pointerdown', e => {
      const key = e.target.closest('[data-pitch]'); if (!key) return;
      e.preventDefault(); key.setPointerCapture(e.pointerId); this.press('pointer-' + e.pointerId, +key.dataset.pitch);
    });
    element.addEventListener('click', e => { if (e.detail === 0) { const key = e.target.closest('[data-pitch]'); if (key) this.tap(+key.dataset.pitch); } });
    document.addEventListener('keydown', e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === 'Space') { if (e.target.tagName === 'BUTTON') return; e.preventDefault(); this.spaceSustain = true; this.refreshSustain(); return; }
      const offset = 'awsedftgyhujkolp;'.indexOf(e.key.toLowerCase());
      if (offset >= 0) { e.preventDefault(); this.press('key-' + e.code, (this.octave + 1) * 12 + offset); }
    });
    document.addEventListener('keyup', e => { this.release('key-' + e.code); if (e.code === 'Space') { this.spaceSustain = false; this.refreshSustain(); } });
    this.draw();
  }
  async press(id, pitch) {
    if (this.held.has(id)) return;
    const pending = { pitch, voice: null }; this.held.set(id, pending); this.highlight();
    try {
      await this.audio.init();
      if (this.held.get(id) !== pending) return;
      pending.voice = this.audio.note(pitch);
    } catch (error) { this.held.delete(id); this.highlight(); this.report(error.message, true); }
  }
  async tap(pitch) { try { await this.audio.init(); this.audio.note(pitch, this.audio.context.currentTime, .45, 'preview'); } catch (e) { this.report(e.message, true); } }
  release(id) {
    const entry = this.held.get(id); if (!entry) return;
    if (entry.voice) { if (this.sustain) this.sustained.add(entry.voice); else entry.voice.release(); }
    this.held.delete(id); this.highlight();
  }
  refreshSustain() {
    this.sustain = Boolean(this.buttonSustain || this.spaceSustain);
    if (!this.sustain) { for (const voice of this.sustained) voice.release(); this.sustained.clear(); }
    document.getElementById('sustain').setAttribute('aria-pressed', String(this.sustain));
  }
  panic() {
    this.held.clear(); this.sustained.clear(); this.buttonSustain = this.spaceSustain = false; this.refreshSustain(); this.audio.stop(); this.highlight();
  }
  draw() {
    this.element.replaceChildren(); this.element.dataset.octaves = this.octaves;
    const first = (this.octave + 1) * 12, count = this.octaves * 12 + 1;
    const whiteCount = this.octaves * 7 + 1; let whites = 0;
    for (let offset = 0; offset < count; offset++) {
      const pitch = first + offset, black = [1, 3, 6, 8, 10].includes(mod(pitch));
      const button = document.createElement('button'); button.dataset.pitch = pitch; button.className = black ? 'black' : 'white';
      button.type = 'button'; button.setAttribute('aria-label', `Play ${pitchName(pitch)}${Math.floor(pitch / 12) - 1}`);
      const label = document.createElement('span'); label.textContent = this.labels ? pitchName(pitch) + (black ? '' : Math.floor(pitch / 12) - 1) : ''; button.append(label);
      if (black) { const width = 64 / whiteCount; button.style.width = width + '%'; button.style.left = (whites * 100 / whiteCount - width / 2) + '%'; }
      else whites++;
      this.element.append(button);
    }
    this.highlight();
  }
  highlight(chord = this.chord || [], scale = this.scale || [], sounding = this.sounding || []) {
    this.chord = chord; this.scale = scale; this.sounding = sounding;
    const held = [...this.held.values()].map(e => e.pitch);
    this.element.querySelectorAll('[data-pitch]').forEach(key => {
      const pitch = +key.dataset.pitch;
      key.classList.toggle('pressed', held.includes(pitch)); key.setAttribute('aria-pressed', String(held.includes(pitch)));
      key.classList.toggle('chord-note', chord.some(n => mod(n) === mod(pitch)));
      key.classList.toggle('in-scale', scale.includes(mod(pitch)));
      key.classList.toggle('sounding', sounding.includes(pitch));
    });
  }
}

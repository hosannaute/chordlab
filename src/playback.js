import { composition } from "./project.js";
export class Playback {
  constructor(audio, onFrame, onStop) {
    this.audio = audio;
    this.onFrame = onFrame;
    this.onStop = onStop;
    this.generation = 0;
  }
  async play(project, loop, part = "all") {
    this.stop();
    const generation = this.generation;
    await this.audio.init();
    if (generation !== this.generation) return;
    const song = composition(project, part);
    if (!song.beats) return;
    this.song = song;
    this.tempo = project.tempo;
    this.loop = loop;
    this.cursor = 0;
    this.anchorBeat = 0;
    this.anchorTime = this.audio.context.currentTime + 0.04;
    this.running = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), 25);
  }
  currentBeat() {
    return (
      this.anchorBeat +
      ((this.audio.context.currentTime - this.anchorTime) * this.tempo) / 60
    );
  }
  setTempo(tempo) {
    if (this.running) {
      this.anchorBeat = this.currentBeat();
      this.anchorTime = this.audio.context.currentTime;
    }
    this.tempo = tempo;
  }
  tick() {
    if (!this.running) return;
    const beat = this.currentBeat(),
      now = this.audio.context.currentTime,
      lookahead = beat + (0.12 * this.tempo) / 60;
    while (true) {
      const index = this.cursor % this.song.events.length,
        cycle = Math.floor(this.cursor / this.song.events.length);
      if (!this.loop && cycle > 0) break;
      const event = this.song.events[index];
      const start = event.start + cycle * this.song.beats;
      if (start > lookahead) break;
      if (start >= beat - 0.2) {
        const when = now + (Math.max(0, start - beat) * 60) / this.tempo;
        this.audio.note(
          event.pitch,
          when,
          (event.beats * 60) / this.tempo,
          "transport",
        );
      }
      this.cursor++;
    }
    const position = Math.max(0, beat) % this.song.beats;
    this.onFrame(
      position,
      this.song.events.filter(
        (e) => position >= e.start && position < e.start + e.beats,
      ),
    );
    if (!this.loop && beat >= this.song.beats + (0.8 * this.tempo) / 60)
      this.stop();
  }
  stop() {
    this.generation++;
    clearInterval(this.timer);
    this.running = false;
    this.audio.stop("transport");
    this.onStop?.();
  }
}

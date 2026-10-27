import { composition } from "./project.js";
export class Playback {
  constructor(audio, onFrame, onStop) {
    this.audio = audio;
    this.onFrame = onFrame;
    this.onStop = onStop;
    this.generation = 0;
    this.scheduled = [];
  }
  async play(project, loop = true, part = "all") {
    this.stop();
    const generation = this.generation;
    await this.audio.init();
    if (generation !== this.generation) return;
    const song = composition(project, part);
    if (!song.beats) return;
    this.song = song;
    this.tempo = project.tempo;
    this.loop = loop;
    this.wasLooping = loop;
    this.endBeat = song.beats;
    this.tracks = song.tracks.map((track) => ({ ...track, cursor: 0 }));
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
    this.scheduled = this.scheduled.filter((note) => note.endTime > now);
    if (this.wasLooping && !this.loop) {
      this.endBeat =
        (Math.floor(Math.max(0, beat) / this.song.beats) + 1) * this.song.beats;
      const cutoff = now + ((this.endBeat - beat) * 60) / this.tempo;
      this.scheduled = this.scheduled.filter((note) => {
        if (note.startBeat >= this.endBeat) {
          note.voice?.release(now, true);
          note.track.cursor = Math.min(note.track.cursor, note.cursor);
          return false;
        }
        if (note.endBeat > this.endBeat) note.voice?.release(cutoff, true);
        return true;
      });
    }
    this.wasLooping = this.loop;
    const active = [];
    for (const track of this.tracks) {
      // Each phrase repeats on the same audio clock without waiting for the other part.
      // Skip missed cycles after a long scheduler stall instead of building a backlog.
      const cycleFloor = Math.max(0, Math.floor((beat - 0.2) / track.beats));
      track.cursor = Math.max(track.cursor, cycleFloor * track.events.length);
      while (true) {
        const index = track.cursor % track.events.length,
          cycle = Math.floor(track.cursor / track.events.length),
          event = track.events[index],
          start = event.start + cycle * track.beats;
        if (start > lookahead || (!this.loop && start >= this.endBeat)) break;
        if (start >= beat - 0.2) {
          const when = now + (Math.max(0, start - beat) * 60) / this.tempo;
          const duration = Math.min(
            event.beats,
            track.beats - event.start,
            this.loop ? Infinity : this.endBeat - start,
          );
          const voice = this.audio.note(
            event.pitch,
            when,
            (duration * 60) / this.tempo,
            "transport",
          );
          this.scheduled.push({
            voice,
            track,
            cursor: track.cursor,
            startBeat: start,
            endBeat: start + duration,
            endTime: when + (duration * 60) / this.tempo,
          });
        }
        track.cursor++;
      }
      const position = Math.max(0, beat) % track.beats;
      if (this.loop || beat < this.endBeat)
        active.push(
          ...track.events.filter(
            (e) => position >= e.start && position < e.start + e.beats,
          ),
        );
    }
    const position = this.loop
      ? Math.max(0, beat) % this.song.beats
      : Math.min(Math.max(0, beat), this.endBeat);
    const melody = this.tracks.find((track) => track.name === "melody");
    this.onFrame(
      position,
      active,
      melody
        ? this.loop || beat < this.endBeat
          ? Math.max(0, beat) % melody.beats
          : melody.beats
        : position,
    );
    if (!this.loop && beat >= this.endBeat + (0.8 * this.tempo) / 60)
      this.stop();
  }
  stop() {
    this.generation++;
    clearInterval(this.timer);
    this.running = false;
    this.scheduled = [];
    this.audio.stop("transport");
    this.onStop?.();
  }
}

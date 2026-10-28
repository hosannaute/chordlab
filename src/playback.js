import { composition } from "./project.js";
import { eventDuration } from "./studio.js";
import { barBeats, meterOf } from "./timing.js";
export class Playback {
  constructor(audio, onFrame, onStop) {
    this.audio = audio;
    this.onFrame = onFrame;
    this.onStop = onStop;
    this.generation = 0;
    this.scheduled = [];
  }
  async play(project, loop = true, part = "all", options = {}) {
    this.stop();
    const generation = this.generation;
    this.audio.piano = { ...this.audio.piano, ...project.piano };
    this.audio.setMix?.(project.mix);
    await this.audio.init();
    if (generation !== this.generation) return;
    const song = composition(project, part);
    if (options.recording)
      song.beats = Math.max(
        song.beats,
        project.melodyBars * barBeats(project) || barBeats(project),
      );
    if (!song.beats) return;
    this.song = song;
    this.tempo = project.tempo;
    this.loop = loop;
    this.wasLooping = loop;
    this.endBeat = song.beats;
    this.tracks = song.tracks.map((track) => ({ ...track, cursor: 0 }));
    this.anchorBeat = 0;
    this.bar = barBeats(project);
    this.clickStep = 4 / meterOf(project).denominator;
    this.countInBeats = options.countIn
      ? (project.metronome?.countIn || 0) * this.bar
      : 0;
    this.metronome = project.metronome?.enabled || false;
    this.clickCursor = -this.countInBeats;
    this.scheduledClicks = [];
    this.anchorTime =
      this.audio.context.currentTime +
      0.04 +
      (this.countInBeats * 60) / this.tempo;
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
    if (tempo === this.tempo) return;
    if (this.running) {
      const beat = this.currentBeat(),
        now = this.audio.context.currentTime;
      this.anchorBeat = beat;
      this.anchorTime = now;
      this.scheduled = this.scheduled.filter((note) => {
        if (note.startBeat > beat + 1e-9) {
          note.voice?.release(now, true);
          note.track.cursor = Math.min(note.track.cursor, note.cursor);
          return false;
        }
        if (note.endBeat > beat) {
          note.endTime = now + ((note.endBeat - beat) * 60) / tempo;
          note.voice?.retime?.(note.endTime);
        }
        return true;
      });
      this.scheduledClicks = this.scheduledClicks.filter((click) => {
        if (click.beat > beat + 1e-9) {
          click.voice?.release(now);
          this.clickCursor = Math.min(this.clickCursor, click.beat);
          return false;
        }
        return true;
      });
    }
    this.tempo = tempo;
    if (this.running) this.tick();
  }
  setMetronome(enabled) {
    this.metronome = enabled;
    if (!enabled && this.running) {
      const now = this.audio.context.currentTime;
      this.scheduledClicks = this.scheduledClicks.filter((click) => {
        if (click.beat >= 0 && click.time > now) {
          click.voice?.release(now);
          return false;
        }
        return true;
      });
    }
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
    this.scheduledClicks = this.scheduledClicks.filter(
      (click) => click.time + 0.05 > now,
    );
    this.clickCursor = Math.max(
      this.clickCursor,
      Math.ceil((beat - 0.2) / this.clickStep) * this.clickStep,
    );
    while (this.clickCursor <= lookahead) {
      const clickBeat = this.clickCursor;
      if (
        (clickBeat >= 0 || clickBeat >= -this.countInBeats) &&
        (this.loop || clickBeat < this.endBeat) &&
        (this.metronome || clickBeat < 0)
      ) {
        const time = now + (Math.max(0, clickBeat - beat) * 60) / this.tempo;
        const voice = this.audio.click?.(
          time,
          Math.abs(clickBeat % this.bar) < 1e-9,
        );
        this.scheduledClicks.push({ voice, beat: clickBeat, time });
      }
      this.clickCursor += this.clickStep;
    }
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
            eventDuration(track, event),
            this.loop ? Infinity : this.endBeat - start,
          );
          const voice = this.audio.note(
            event.pitch,
            when,
            (duration * 60) / this.tempo,
            "transport",
            { track: track.name, velocity: event.velocity },
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
      if (beat >= 0 && (this.loop || beat < this.endBeat))
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
    this.scheduledClicks = [];
    this.audio.stop("metronome");
    this.audio.stop("transport");
    this.onStop?.();
  }
}

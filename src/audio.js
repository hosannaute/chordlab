const PRESETS = {
  "soft-piano": {
    wave: "triangle",
    attack: 0.006,
    decay: 1.4,
    sustain: 0.12,
    release: 0.22,
    harmonics: [1, 0.25],
  },
  "electric-piano": {
    wave: "sine",
    attack: 0.004,
    decay: 1.8,
    sustain: 0.2,
    release: 0.3,
    harmonics: [1, 0.4, 0.12],
  },
  "synth-pad": {
    wave: "triangle",
    attack: 0.28,
    decay: 0.8,
    sustain: 0.75,
    release: 0.65,
    harmonics: [1, 0.18],
  },
  "plucked-synth": {
    wave: "sawtooth",
    attack: 0.003,
    decay: 0.22,
    sustain: 0.02,
    release: 0.1,
    harmonics: [1],
  },
  organ: {
    wave: "sine",
    attack: 0.009,
    decay: 0.05,
    sustain: 0.85,
    release: 0.08,
    harmonics: [1, 0.45, 0.2],
  },
};
export class AudioEngine {
  constructor() {
    this.voices = new Set();
    this.volume = 0.65;
    this.instrument = "soft-piano";
  }
  async init() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context)
        throw new Error("Web Audio is unavailable in this browser.");
      this.context = new Context({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.limiter = this.context.createDynamicsCompressor();
      this.limiter.threshold.value = -12;
      this.limiter.knee.value = 12;
      this.limiter.ratio.value = 12;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.15;
      this.master.connect(this.limiter).connect(this.context.destination);
    }
    if (this.context.state !== "running") await this.context.resume();
    if (this.context.state !== "running")
      throw new Error("Audio could not start. Tap a key to try again.");
  }
  setVolume(value) {
    this.volume = value;
    if (this.master)
      this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.02);
  }
  note(
    pitch,
    when = this.context.currentTime,
    duration = null,
    group = "live",
  ) {
    const a = this.context,
      preset = PRESETS[this.instrument];
    if (this.voices.size >= 32) {
      const oldest = this.voices.values().next().value;
      oldest.release(a.currentTime, true);
      this.voices.delete(oldest);
    }
    const envelope = a.createGain();
    envelope.gain.value = 0;
    envelope.connect(this.master);
    const start = Math.max(a.currentTime, when),
      peak = 0.025;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + preset.attack);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * preset.sustain),
      start + preset.attack + preset.decay,
    );
    const oscillators = preset.harmonics.map((amplitude, i) => {
      const oscillator = a.createOscillator(),
        gain = a.createGain();
      oscillator.type = preset.wave;
      oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12) * (i + 1);
      gain.gain.value =
        amplitude / preset.harmonics.reduce((sum, n) => sum + n, 0);
      oscillator.connect(gain).connect(envelope);
      oscillator.start(start);
      return { oscillator, gain };
    });
    let released = false,
      remaining = oscillators.length;
    const voice = {
      pitch,
      group,
      release: (time = a.currentTime, immediate = false) => {
        if (released && !immediate) return;
        released = true;
        const at = Math.max(a.currentTime, time),
          tail = immediate ? 0.015 : preset.release;
        if (at < start) {
          envelope.gain.cancelScheduledValues(at);
          envelope.gain.setValueAtTime(0.0001, at);
        } else if (envelope.gain.cancelAndHoldAtTime)
          envelope.gain.cancelAndHoldAtTime(at);
        else {
          envelope.gain.cancelScheduledValues(at);
          envelope.gain.setValueAtTime(
            Math.max(0.0001, envelope.gain.value),
            at,
          );
        }
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + tail);
        oscillators.forEach(({ oscillator }) =>
          oscillator.stop(at + tail + 0.01),
        );
      },
    };
    oscillators.forEach(({ oscillator, gain }) => {
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        if (--remaining === 0) {
          envelope.disconnect();
          this.voices.delete(voice);
        }
      };
    });
    this.voices.add(voice);
    if (duration !== null) voice.release(start + duration);
    return voice;
  }
  stop(group) {
    for (const voice of this.voices)
      if (!group || voice.group === group)
        voice.release(this.context.currentTime, true);
  }
}

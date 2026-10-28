export const GRAND_SAMPLES = Array.from({ length: 21 }, (_, index) => {
  const pitch = 36 + index * 3;
  return {
    pitch,
    file:
      ["C", "Ds", "Fs", "A"][index % 4] + (Math.floor(pitch / 12) - 1) + ".mp3",
  };
});
export const LAYER_SAMPLES = GRAND_SAMPLES.flatMap((sample) =>
  ["soft", "hard"].map((layer) => ({
    ...sample,
    key: `${layer}-${sample.pitch}`,
    file: `layers/${sample.file.replace(".mp3", `-${layer}.mp3`)}`,
  })),
);
export function nearestSample(pitch) {
  if (!Number.isFinite(pitch)) throw new Error("Invalid piano pitch");
  return GRAND_SAMPLES.reduce((best, sample) =>
    Math.abs(sample.pitch - pitch) < Math.abs(best.pitch - pitch)
      ? sample
      : best,
  );
}
export class GrandPiano {
  constructor(
    context,
    onProgress = () => {},
    fetchSample = (...args) => globalThis.fetch(...args),
  ) {
    this.context = context;
    this.onProgress = onProgress;
    this.fetch = fetchSample;
    this.buffers = new Map();
    this.pending = null;
  }
  isReady(layers = false) {
    return (layers ? LAYER_SAMPLES : GRAND_SAMPLES).every((sample) =>
      this.buffers.has(sample.key ?? sample.pitch),
    );
  }
  async load(layers = false) {
    if (this.isReady(layers)) return;
    if (this.pending) {
      await this.pending;
      return this.load(layers);
    }
    this.pending = this.loadMissing(layers ? LAYER_SAMPLES : GRAND_SAMPLES);
    try {
      await this.pending;
    } finally {
      this.pending = null;
    }
  }
  async loadMissing(required = GRAND_SAMPLES) {
    const missing = required.filter(
      (sample) => !this.buffers.has(sample.key ?? sample.pitch),
    );
    let index = 0;
    const progress = () =>
      this.onProgress(
        required.filter((sample) =>
          this.buffers.has(sample.key ?? sample.pitch),
        ).length,
        required.length,
      );
    progress();
    const worker = async () => {
      while (index < missing.length) {
        const sample = missing[index++];
        const base = import.meta.env?.BASE_URL || "/chordlab/";
        const response = await this.fetch(
          `${base}audio/grand-piano/${sample.file}`,
          { signal: AbortSignal.timeout(30000) },
        );
        if (!response.ok)
          throw new Error(
            `Grand piano sample ${sample.file} could not load (${response.status}). Try again or choose a synth sound.`,
          );
        const buffer = await this.context.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (!(buffer.duration > 0))
          throw new Error(`Grand piano sample ${sample.file} is empty.`);
        let peak = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++)
          for (const value of buffer.getChannelData(channel))
            peak = Math.max(peak, Math.abs(value));
        if (!peak || !Number.isFinite(peak))
          throw new Error(
            `Grand piano sample ${sample.file} has no usable audio.`,
          );
        this.buffers.set(sample.key ?? sample.pitch, { buffer, peak });
        progress();
      }
    };
    // Settle every worker before allowing a retry, so failed loads cannot overlap.
    const results = await Promise.allSettled(
      Array.from({ length: Math.min(3, missing.length) }, worker),
    );
    const failed = results.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
  }
  get(pitch, velocity = 96, layers = false) {
    const sample = nearestSample(pitch),
      layer = velocity < 80 ? "soft" : "hard",
      decoded = this.buffers.get(
        layers ? `${layer}-${sample.pitch}` : sample.pitch,
      );
    if (!decoded)
      throw new Error(
        "Grand piano is still loading. Wait for the samples or choose a synth sound.",
      );
    return {
      ...decoded,
      pitch: sample.pitch,
      layer: layers ? layer : "compact",
      rate: 2 ** ((pitch - sample.pitch) / 12),
    };
  }
}

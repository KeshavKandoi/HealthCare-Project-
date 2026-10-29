/** Signal geometry only: no interpolation, filtering, synthetic beats or voltage conversion. */
export type SignalChunk = { sequence: number | string; first_sample_at: string; samples: number[] };
export type SignalPoint = { time: number; value: number; index: number };
export type AmplitudeScale = { center: number; perDivision: number };
export type SignalDiagnostics = { repeatedChunks: number; missingSequences: number; gaps: number; overlaps: number; nonFinite: number; sampleCount: number; low: number; high: number };
export const validRate = (rate: number) => Number.isFinite(rate) && rate > 0 && rate <= 2000;
export const orderedChunks = (chunks: SignalChunk[]) => [...chunks].sort((a, b) => Date.parse(a.first_sample_at) - Date.parse(b.first_sample_at) || Number(a.sequence) - Number(b.sequence));
export function niceStep(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].find(n => n * power >= value)! * power;
}
export function inspectSignal(chunks: SignalChunk[], rate: number): SignalDiagnostics {
  const result = { repeatedChunks: 0, missingSequences: 0, gaps: 0, overlaps: 0, nonFinite: 0, sampleCount: 0, low: Infinity, high: -Infinity };
  let previous: SignalChunk | undefined;
  for (const chunk of orderedChunks(chunks)) {
    for (const value of chunk.samples) {
      result.sampleCount++;
      if (!Number.isFinite(value)) { result.nonFinite++; continue; }
      result.low = Math.min(result.low, value); result.high = Math.max(result.high, value);
    }
    if (previous && validRate(rate)) {
      const delta = Date.parse(chunk.first_sample_at) - (Date.parse(previous.first_sample_at) + previous.samples.length * 1000 / rate);
      // Millisecond packet timestamps may round the exact sample period; never bridge a missing sample.
      if (delta > Math.min(1.01, 500 / rate)) result.gaps++;
      if (delta < -Math.min(1.01, 500 / rate)) result.overlaps++;
      result.missingSequences += Math.max(0, Number(chunk.sequence) - Number(previous.sequence) - 1);
      if (chunk.samples.length === previous.samples.length && chunk.samples.every((v, i) => v === previous!.samples[i])) result.repeatedChunks++;
    }
    previous = chunk;
  }
  return result;
}
/** Pick a raw-unit display scale ONCE per recording, not for every beat or viewport. */
export function initialScale(chunks: SignalChunk[], units: string): AmplitudeScale {
  if (units === 'mV') return { center: 0, perDivision: 0.5 };
  const { low, high } = inspectSignal(chunks, 0);
  if (!Number.isFinite(low)) return { center: 0, perDivision: 100 };
  const perDivision = niceStep(Math.max(high - low, Math.abs(high) * 0.05, 1) / 4);
  return { center: Math.round((low + high) / 2 / perDivision) * perDivision, perDivision };
}
/** Exact timestamps and values. Segments break on sequence gaps, clock gaps/overlaps and invalid values. */
export function signalSegments(chunks: SignalChunk[], rate: number, start: number, end: number): SignalPoint[][] {
  if (!validRate(rate) || !Number.isFinite(start) || !(end > start)) return [];
  const segments: SignalPoint[][] = [];
  let current: SignalPoint[] = [], previous: SignalChunk | undefined;
  const period = 1000 / rate;
  for (const chunk of orderedChunks(chunks)) {
    const time = Date.parse(chunk.first_sample_at);
    if (!Number.isFinite(time)) { current = []; previous = undefined; continue; }
    const expected = previous ? Date.parse(previous.first_sample_at) + previous.samples.length * period : NaN;
    if (!previous || Number(chunk.sequence) !== Number(previous.sequence) + 1 || Math.abs(time - expected) > Math.min(1.01, period / 2)) current = [];
    const from = Math.max(0, Math.ceil((start - time) / period));
    const to = Math.min(chunk.samples.length, Math.ceil((end - time) / period));
    for (let i = from; i < to; i++) {
      const value = chunk.samples[i];
      if (!Number.isFinite(value)) { current = []; continue; }
      if (!current.length) { current = []; segments.push(current); }
      current.push({ time: time + i * period, value, index: i });
    }
    previous = chunk;
  }
  return segments;
}
/** Keep first/min/max/last actual samples in chronological order per pixel. No invented averages. */
export function reduceToPixels(points: SignalPoint[], start: number, span: number, width: number): SignalPoint[] {
  if (points.length <= width * 2) return points;
  const output: SignalPoint[] = [];
  let bucket: SignalPoint[] = [], pixel = -Infinity;
  const flush = () => {
    if (!bucket.length) return;
    let min = 0, max = 0;
    for (let i = 1; i < bucket.length; i++) { if (bucket[i].value < bucket[min].value) min = i; if (bucket[i].value > bucket[max].value) max = i; }
    for (const i of [...new Set([0, min, max, bucket.length - 1])].sort((a, b) => a - b)) output.push(bucket[i]);
  };
  for (const point of points) {
    const next = Math.floor((point.time - start) / span * width);
    if (next !== pixel) { flush(); bucket = []; pixel = next; }
    bucket.push(point);
  }
  flush(); return output;
}

export type ReportSession = {
  id: string; patient_id: string; device_id: string; status: string;
  started_at: string | Date; ended_at: string | Date | null;
  target_hours: number; sample_rate_hz: number; sample_count: number | string; is_simulated?: boolean;
};
export type ReportChunk = {
  sequence: number | string; first_sample_at: string | Date;
  sample_count: number; samples?: number[];
};
export type ReportMarker = {
  id: string; symptom: string; marked_at: string | Date; note?: string | null;
};

export function makeTechnicalReport(
  session: ReportSession,
  chunks: ReportChunk[],
  markers: ReportMarker[],
  events: object[],
  measurements: object[],
  asOf = new Date(),
) {
  const started = new Date(session.started_at).getTime();
  const ended = session.ended_at ? new Date(session.ended_at).getTime() : asOf.getTime();
  const durationMs = Math.max(0, ended - started);
  const intervals = chunks.map(chunk => {
    const first = new Date(chunk.first_sample_at).getTime();
    const length = chunk.sample_count * 1000 / session.sample_rate_hz;
    return { start: Math.max(first, started), end: Math.min(first + length, ended), sequence: Number(chunk.sequence), first, count: chunk.sample_count };
  }).filter(item => item.end > item.start).sort((a, b) => a.start - b.start);
  let availableCoverageMs = 0;
  let endOfCoverage = started;
  for (const interval of intervals) {
    availableCoverageMs += Math.max(0, interval.end - Math.max(interval.start, endOfCoverage));
    endOfCoverage = Math.max(endOfCoverage, interval.end);
  }
  const sortedSequences = [...new Set(chunks.map(chunk => Number(chunk.sequence)))].sort((a, b) => a - b);
  const missingSequences = sortedSequences.reduce((count, sequence, index) => count + (index ? Math.max(0, sequence - sortedSequences[index - 1] - 1) : Math.max(0, sequence)), 0);
  const linkedMarkers = markers.map(marker => {
    const markedAt = new Date(marker.marked_at).getTime();
    const segment = intervals.find(interval => markedAt >= interval.first && markedAt < interval.first + interval.count * 1000 / session.sample_rate_hz);
    return { ...marker, chunk_sequence: segment?.sequence ?? null, sample_offset: segment ? Math.min(segment.count - 1, Math.floor((markedAt - segment.first) * session.sample_rate_hz / 1000)) : null };
  });
  return {
    sessionId: session.id,
    isSimulated: session.is_simulated === true,
    status: session.status,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    asOf: asOf.toISOString(),
    targetHours: session.target_hours,
    actualDurationMs: durationMs,
    availableCoverageMs: Math.round(availableCoverageMs),
    availableCoveragePercent: durationMs ? Math.min(100, Math.round(availableCoverageMs / durationMs * 1000) / 10) : 0,
    qualityVerified: false,
    sampleCount: Number(session.sample_count),
    receivedBatchCount: chunks.length,
    missingSequences,
    deviceEvents: events,
    symptomMarkers: linkedMarkers,
    verifiedMeasurements: measurements,
    interpretation: session.is_simulated ? 'SIMULATED DATA: for testing only. Not suitable for clinical interpretation.' : 'Technical recording summary only. Signal quality and clinical interpretation require qualified review.',
  };
}

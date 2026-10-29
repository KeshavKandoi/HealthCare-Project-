import { useEffect, useState } from 'react';
import { scenarioVitals, simulationSample, simulationSeed, type SignalMode, type WaveformMode } from './simulation';

// Wall-clock time, so every monitor and the backoffice preview show the same moment.
// It wraps hourly to keep the beat schedule small.
export const liveSeconds = () => (Date.now() / 1000) % 3600;
const config = (mode: SignalMode) => ({ scenario: 'resting-v2' as const, seed: simulationSeed, mode });
export const liveSample = (seconds: number, mode: SignalMode) => simulationSample(seconds, config(mode));
export type LiveVitals = ReturnType<typeof scenarioVitals>;

/** Readings for the selected mode, refreshed every second; null while the leads are off. */
export function useLiveVitals(mode: WaveformMode): LiveVitals | null {
  const [vitals, setVitals] = useState<LiveVitals | null>(null);
  useEffect(() => {
    if (mode === 'off') return;
    const read = () => setVitals(scenarioVitals(liveSeconds(), config(mode)));
    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);
  return mode === 'off' ? null : vitals;
}

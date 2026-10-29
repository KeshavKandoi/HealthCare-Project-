import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import API from '../Api/API';
import { isWaveformMode, type WaveformMode } from '../components/ECG/simulation';

export const BACKOFFICE_EMAIL = 'keshavkandoi@gmail.com';
const SESSION_KEY = 'heartline.backoffice';
export type BackofficeSession = { token: string; expiresAt: string; email: string };
export type WaveformState = { mode: WaveformMode; updatedAt: string | null };

export const waveformModeOptions: { mode: WaveformMode; label: string; summary: string; detail: string }[] = [
  { mode: 'normal', label: 'Normal', summary: 'Resting rhythm', detail: 'The default simulated heartbeat, about 70–95 BPM.' },
  { mode: 'off', label: 'Off', summary: 'Leads are not connected', detail: 'The waveform disappears from the live panel.' },
  { mode: 'post-workout', label: 'High heart rate', summary: 'After a workout', detail: 'Fast rhythm around 135–155 BPM with raised blood pressure.' },
  { mode: 'heavy-breathing', label: 'Heavy breathing', summary: 'Deep, rapid breaths', detail: 'Heart rate rises and falls with each breath; the baseline wanders.' },
  { mode: 'high-bp', label: 'High blood pressure', summary: 'Hypertensive reading', detail: 'About 170/105 mmHg. Sends a test alert by email, SMS and voice call.' },
];

type TestAlertDelivery = { status: string; detail: string | null };
export type TestAlertResult = { recorded: boolean; reason?: string; deliveries?: Record<'email' | 'sms' | 'voice', TestAlertDelivery> };

// Kept apart from the patient client: no patient token, demo adapter, or patient refresh on 401.
const client = axios.create({ baseURL: API.defaults.baseURL, timeout: 120000 });
const authorized = () => ({ headers: { Authorization: `Bearer ${storedBackofficeSession()?.token}` } });

export function clearBackofficeSession(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
}

export function storedBackofficeSession(): BackofficeSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as BackofficeSession | null;
    if (session?.token && Date.parse(session.expiresAt) > Date.now()) return session;
  } catch { /* treated as signed out */ }
  clearBackofficeSession();
  return null;
}

/** Resolves false when these are not the backoffice credentials, so patient sign-in can continue. */
export async function signInToBackoffice(email: string, password: string): Promise<boolean> {
  if (email.trim().toLowerCase() !== BACKOFFICE_EMAIL) return false;
  try {
    const { data } = await client.post<BackofficeSession>('/backoffice/login', { email, password });
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return false;
    throw new Error(axios.isAxiosError(error) && error.response?.status === 429 ? 'Too many sign-in attempts. Please try again later.' : 'The backoffice is unavailable right now. Please try again shortly.');
  }
}

export const isUnauthorized = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 401;

export async function verifyBackofficeSession(): Promise<void> {
  await client.get('/backoffice/session', authorized());
}

export async function fetchWaveformState(): Promise<WaveformState> {
  const { data } = await client.get<WaveformState>('/backoffice/waveform');
  if (!isWaveformMode(data?.mode)) throw new Error('Unexpected waveform state');
  return data;
}

export async function saveWaveformMode(mode: WaveformMode): Promise<WaveformState & { persisted: boolean; testAlert?: TestAlertResult }> {
  const { data } = await client.put<WaveformState & { persisted: boolean; testAlert?: TestAlertResult }>('/backoffice/waveform', { mode }, authorized());
  return data;
}

// Polls and pushes can arrive out of order; never let an older change replace a newer one.
// A state without updatedAt comes from a server with no stored mode and is always current.
const newer = (next: WaveformState, current: WaveformState) => !next.updatedAt || !current.updatedAt || next.updatedAt >= current.updatedAt;

/** Live monitors follow the backoffice mode. An unreachable or older API keeps the normal waveform. */
export function useWaveformMode(intervalMs = 5000): [WaveformState, (next: WaveformState) => void] {
  const [state, setState] = useState<WaveformState>({ mode: 'normal', updatedAt: null });
  const update = useCallback((next: WaveformState) => {
    if (isWaveformMode(next?.mode)) setState(current => newer(next, current) ? next : current);
  }, []);
  useEffect(() => {
    let active = true;
    const poll = () => fetchWaveformState().then(next => { if (active) update(next); }, () => { /* keep the last known mode */ });
    void poll();
    const timer = window.setInterval(poll, intervalMs);
    return () => { active = false; window.clearInterval(timer); };
  }, [intervalMs, update]);
  return [state, update];
}

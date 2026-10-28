import API from '../Api/API';

export type PendingSymptom = { clientId: string; sessionId: string; symptom: string; markedAt: string };
const key = (patientId: string) => `heartline.pendingSymptoms.${patientId}`;

function read(patientId: string): PendingSymptom[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key(patientId)) || '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item.clientId === 'string' && typeof item.sessionId === 'string') as PendingSymptom[] : [];
  } catch { return []; }
}

function write(patientId: string, queue: PendingSymptom[]) {
  try { sessionStorage.setItem(key(patientId), JSON.stringify(queue)); } catch { /* the current tab still shows a warning */ }
}

export function queueSymptom(patientId: string, sessionId: string, symptom: string): PendingSymptom {
  const marker = { clientId: crypto.randomUUID(), sessionId, symptom, markedAt: new Date().toISOString() };
  write(patientId, [...read(patientId), marker]);
  return marker;
}

let flushing: Promise<number> | null = null;
export async function syncSymptoms(patientId: string): Promise<number> {
  if (flushing) { await flushing; if (read(patientId).length) return syncSymptoms(patientId); return 0; }
  flushing = (async () => {
    while (read(patientId).length) {
      const marker = read(patientId)[0];
      await API.post(`/monitoring/sessions/${marker.sessionId}/markers`, marker);
      write(patientId, read(patientId).filter(item => item.clientId !== marker.clientId));
    }
    return 0;
  })();
  try { return await flushing; } finally { flushing = null; }
}

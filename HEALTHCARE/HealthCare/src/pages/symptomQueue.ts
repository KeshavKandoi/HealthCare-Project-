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

let flushing = false;
export async function syncSymptoms(patientId: string): Promise<number> {
  if (flushing) return read(patientId).length;
  flushing = true;
  try {
    const queue = read(patientId);
    while (queue.length) {
      const marker = queue[0];
      await API.post(`/monitoring/sessions/${marker.sessionId}/markers`, marker);
      queue.shift();
      write(patientId, queue);
    }
    return 0;
  } finally { flushing = false; }
}

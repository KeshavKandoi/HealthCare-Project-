export const DEMO_SESSION_KEY = 'heartline.patientDemo';
import { resetDemoData } from './demoApi';

let memoryDemoSession = false;

export function isDemoSession(): boolean {
  try {
    return memoryDemoSession || sessionStorage.getItem(DEMO_SESSION_KEY) === '1';
  } catch {
    return memoryDemoSession;
  }
}

export function enterDemoSession(): void {
  try { localStorage.removeItem('appData'); } catch { /* demo does not need local storage */ }
  resetDemoData();
  memoryDemoSession = true;
  try { sessionStorage.setItem(DEMO_SESSION_KEY, '1'); } catch { /* keep this tab in demo memory */ }
}

export function leaveDemoSession(): void {
  memoryDemoSession = false;
  try { sessionStorage.removeItem(DEMO_SESSION_KEY); } catch { /* storage unavailable */ }
  resetDemoData();
}

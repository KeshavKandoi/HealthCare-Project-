import axios from 'axios';
import type { AuthSession } from '../types/domain';
import { isDemoSession } from '../demo/demoSession';
import { demoAdapter } from '../demo/demoApi';

const API = axios.create({
  baseURL: import.meta.env.VITE_BASEURL || 'http://localhost:4000/api/v1',
  // Render's free instance can take over a minute to wake after inactivity.
  timeout: 120000,
});

API.interceptors.request.use(config => {
  if (isDemoSession()) {
    config.adapter = demoAdapter;
    return config;
  }
  let session: AuthSession | null = null;
  try {
    session = JSON.parse(localStorage.getItem('appData') || 'null') as AuthSession | null;
  } catch {
    localStorage.removeItem('appData');
  }
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

let refreshing: Promise<AuthSession> | null = null;
API.interceptors.response.use(undefined, async error => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config ||
      error.config.url?.startsWith('/user/login') || error.config.url?.startsWith('/user/refresh') ||
      (error.config as typeof error.config & { _retried?: boolean })._retried) throw error;
  let session: AuthSession | null = null;
  try { session = JSON.parse(localStorage.getItem('appData') || 'null') as AuthSession | null; }
  catch { localStorage.removeItem('appData'); throw error; }
  if (!session?.refreshToken) throw error;
  try {
    refreshing ||= axios.post<AuthSession>(`${API.defaults.baseURL}/user/refresh`, { refreshToken: session.refreshToken })
      .then(response => response.data).finally(() => { refreshing = null; });
    const renewed = await refreshing;
    localStorage.setItem('appData', JSON.stringify(renewed));
    (error.config as typeof error.config & { _retried?: boolean })._retried = true;
    error.config.headers.Authorization = `Bearer ${renewed.token}`;
    return API.request(error.config);
  } catch (refreshError) {
    if (axios.isAxiosError(refreshError) && [401, 403].includes(refreshError.response?.status || 0)) localStorage.removeItem('appData');
    throw refreshError;
  }
});

export default API;

export async function endAccountSession(): Promise<void> {
  try {
    const session = JSON.parse(localStorage.getItem('appData') || 'null') as AuthSession | null;
    if (session?.refreshToken) await axios.post(`${API.defaults.baseURL}/user/logout`, { refreshToken: session.refreshToken }, { timeout: 5000 });
  } catch { /* The local session is cleared even when the server cannot be reached. */ }
}

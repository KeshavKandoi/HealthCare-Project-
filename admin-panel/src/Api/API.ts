import axios from 'axios';
import { readAdminSession, type AdminSession } from '../types/domain';

const API = axios.create({
  baseURL: import.meta.env.VITE_BASEURL || 'http://localhost:4000/api/v1',
  timeout: 15000,
});

export async function endAccountSession(): Promise<void> {
  try {
    const session = readAdminSession();
    if (session?.refreshToken) await axios.post(`${API.defaults.baseURL}/user/logout`, { refreshToken: session.refreshToken }, { timeout: 5000 });
  } catch { /* Clear the local session even when the server is unavailable. */ }
}

API.interceptors.request.use(config => {
  const session = readAdminSession();
  if (session) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

let refreshing: Promise<AdminSession> | null = null;
API.interceptors.response.use(undefined, async error => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config ||
      error.config.url?.startsWith('/user/login') || error.config.url?.startsWith('/user/refresh') ||
      (error.config as typeof error.config & { _retried?: boolean })._retried) throw error;
  const session = readAdminSession();
  if (!session?.refreshToken) throw error;
  try {
    refreshing ||= axios.post<AdminSession>(`${API.defaults.baseURL}/user/refresh`, { refreshToken: session.refreshToken })
      .then(response => response.data).finally(() => { refreshing = null; });
    const renewed = await refreshing;
    if (!renewed.user?.isAdmin) throw new Error('Administrator access required');
    localStorage.setItem('appData', JSON.stringify(renewed));
    (error.config as typeof error.config & { _retried?: boolean })._retried = true;
    error.config.headers.Authorization = `Bearer ${renewed.token}`;
    return API.request(error.config);
  } catch {
    localStorage.removeItem('appData');
    throw error;
  }
});

export default API;

import axios from 'axios';
import type { AuthSession } from '../types/domain';
import { isDemoSession } from '../demo/demoSession';
import { demoAdapter } from '../demo/demoApi';

const API = axios.create({
  baseURL: import.meta.env.VITE_BASEURL || 'http://localhost:4000/api/v1',
  timeout: 15000,
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

export default API;

import axios from 'axios';
import { readAdminSession } from '../types/domain';

const API = axios.create({
  baseURL: import.meta.env.VITE_BASEURL || 'http://localhost:4000/api/v1',
  timeout: 15000,
});

API.interceptors.request.use(config => {
  const session = readAdminSession();
  if (session) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

export default API;

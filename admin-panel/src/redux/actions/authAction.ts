import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API from '../../Api/API';
import { readAdminSession, type AdminAccount, type AdminSession } from '../../types/domain';

function failure(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string') return data.message;
  }
  return error instanceof Error ? error.message : 'Authentication failed';
}

export const login = createAsyncThunk<AdminSession, { email: string; password: string }>(
  'auth/login', async (credentials, thunkApi) => {
    try {
      const { data } = await API.post<AdminSession>('/user/login', credentials);
      if (!data.user?.isAdmin || !data.token) throw new Error('Administrator access required');
      localStorage.setItem('appData', JSON.stringify(data));
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(failure(error));
    }
  },
);

export const restoreSession = createAsyncThunk<AdminSession>('auth/restoreSession', async (_, thunkApi) => {
  const session = readAdminSession();
  if (!session) return thunkApi.rejectWithValue('No administrator session');
  try {
    const { data } = await API.get<{ user: AdminAccount }>(`/user/get-login-user/${session.user._id}`);
    if (!data.user?.isAdmin || data.user._id !== session.user._id) throw new Error('Administrator access required');
    const restored = { token: session.token, user: data.user };
    localStorage.setItem('appData', JSON.stringify(restored));
    return restored;
  } catch (error) {
    localStorage.removeItem('appData');
    return thunkApi.rejectWithValue(failure(error));
  }
});

export const getUserData = createAsyncThunk<AdminAccount | null>('auth/getUserData', () => readAdminSession()?.user ?? null);
export const loadToken = createAsyncThunk<string | null>('auth/loadToken', () => readAdminSession()?.token ?? null);

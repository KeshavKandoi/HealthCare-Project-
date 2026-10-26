import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API from '../../Api/API';
import type { AuthSession, PatientAccount } from '../../types/domain';

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as { message?: unknown } | undefined;
    if (typeof response?.message === 'string') return response.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function storedSession(): AuthSession | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('appData') || 'null');
    if (parsed && typeof parsed === 'object' && 'token' in parsed && 'user' in parsed) {
      return parsed as AuthSession;
    }
  } catch {
    localStorage.removeItem('appData');
  }
  return null;
}

export const login = createAsyncThunk<AuthSession, { email: string; password: string }>(
  'auth/login', async (credentials, thunkApi) => {
    try {
      const { data } = await API.post<AuthSession>('/user/login', credentials);
      localStorage.setItem('appData', JSON.stringify(data));
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(errorMessage(error, 'Login failed'));
    }
  },
);

export const register = createAsyncThunk<{ success: boolean; message: string }, { name: string; email: string; password: string }>(
  'auth/register', async (details, thunkApi) => {
    try {
      const { data } = await API.post<{ success: boolean; message: string }>('/user/register', details);
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(errorMessage(error, 'Registration failed'));
    }
  },
);

export const getUserData = createAsyncThunk<PatientAccount | null>('auth/getUserData', () => storedSession()?.user ?? null);
export const loadToken = createAsyncThunk<string | null>('auth/loadToken', () => storedSession()?.token ?? null);

export const getLoginUserDetails = createAsyncThunk<{ user: PatientAccount }, string>(
  'user/getLoginUserDetails', async (id, thunkApi) => {
    try {
      const { data } = await API.get<{ user: PatientAccount }>(`/user/get-login-user/${id}`);
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(errorMessage(error, 'Could not load user'));
    }
  },
);

export const updateUserData = createAsyncThunk<{ user: PatientAccount }, { id: string; formData: FormData }>(
  'user/updateUserData', async ({ id, formData }, thunkApi) => {
    try {
      const { data } = await API.patch<{ user: PatientAccount }>(`/user/update/${id}`, formData);
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(errorMessage(error, 'Could not update user'));
    }
  },
);

export const getAllAppointments = createAsyncThunk<{ appointment: unknown[] }, string>(
  'user/getAllAppointments', async (id, thunkApi) => {
    try {
      const { data } = await API.get<{ appointment: unknown[] }>(`/appointment/get-user-appointments/${id}`);
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(errorMessage(error, 'Could not load appointments'));
    }
  },
);

export const cancelStatus = createAsyncThunk<unknown, string>('user/cancelStatus', async (id, thunkApi) => {
  try {
    const { data } = await API.post<{ appointment: unknown }>(`/appointment/cancel/${id}`);
    return data.appointment;
  } catch (error) {
    return thunkApi.rejectWithValue(errorMessage(error, 'Could not cancel appointment'));
  }
});

export const resetPassword = createAsyncThunk<unknown, { id: string; oldPassword: string; newPassword: string }>(
  'user/resetPassword', async ({ id, oldPassword, newPassword }, thunkApi) => {
    try {
      const { data } = await API.patch(`/user/update-password/${id}`, { oldPassword, newPassword });
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(errorMessage(error, 'Could not update password'));
    }
  },
);

export const bookAppointment = createAsyncThunk<unknown, Record<string, unknown>>(
  'user/bookAppointment', async (bookingData, thunkApi) => {
    try {
      const { data } = await API.post('/appointment/create', bookingData);
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(errorMessage(error, 'Could not book appointment'));
    }
  },
);

export const sendWebMessage = createAsyncThunk<unknown, Record<string, unknown>>(
  'user/sendWebMessage', async (messageData, thunkApi) => {
    try {
      const { data } = await API.post('/webMessage/create', messageData);
      return data;
    } catch (error) {
      return thunkApi.rejectWithValue(errorMessage(error, 'Could not send message'));
    }
  },
);

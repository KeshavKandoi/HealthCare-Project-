import { createSlice } from '@reduxjs/toolkit';
import { getUserData, loadToken, login, restoreSession } from '../actions/authAction';
import type { AdminAccount } from '../../types/domain';

type AuthState = {
  loading: boolean;
  success: boolean;
  user: AdminAccount | null;
  token: string | null;
  error: string | null;
};

const initialState: AuthState = { loading: false, success: false, user: null, token: null, error: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    reset(state) { state.error = null; state.success = false; },
    logout(state) { state.user = null; state.token = null; state.success = false; state.error = null; },
  },
  extraReducers(builder) {
    builder
      .addCase(login.pending, state => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false; state.success = true;
        state.user = action.payload.user; state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false; state.error = String(action.payload || 'Login failed');
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload.user; state.token = action.payload.token;
      })
      .addCase(restoreSession.rejected, state => { state.user = null; state.token = null; })
      .addCase(loadToken.fulfilled, (state, action) => { state.token = action.payload; })
      .addCase(getUserData.fulfilled, (state, action) => { state.user = action.payload; });
  },
});

export const { reset, logout } = authSlice.actions;
export default authSlice.reducer;

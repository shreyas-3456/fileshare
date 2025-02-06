import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import api from '../api'
import { Navigate } from 'react-router-dom'

// Backend API URL

// Async Thunks for Authentication
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/login/', credentials)

      return response.data
    } catch (error) {
      return rejectWithValue(error.response.data)
    }
  }
)
export const adminLogin = createAsyncThunk(
  'auth/adminLogin',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/login/', { username, password })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Admin login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/register/', userData)

      return response.data
    } catch (error) {
      return rejectWithValue(error.response.data)
    }
  }
)

export const fetchUserProfile = createAsyncThunk(
  'auth/profile',
  async (_, { rejectWithValue }) => {
    try {
      // const token = localStorage.getItem('access')
      const response = await api.get('/profile/', {
        credentials: 'include',
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response.data)
    }
  }
)
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // const token = localStorage.getItem('access')
      const response = await api.get('/logout/', {
        credentials: 'include',
      })
      return response.data
    } catch (error) {
      console.log(error)

      return rejectWithValue(error.response.data)
    }
  }
)

const initialState = {
  user: null,
  access: null,
  loading: false,
  error: null,
  email: null,
  reciveCode: false,
  isAdmin: false,
}
// Redux Slice
const authSlice = createSlice({
  name: 'auth',
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        if (!action.payload?.user?.username) {
          return { ...state, loading: false, reciveCode: true }
        }

        state.user = action.payload.user.username
        state.email = action.payload.user.email
        state.loading = false
        return state
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false

        state.error = action.payload
      })
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false
        state.error = null
      })

      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.email = action.payload.email
        state.loading = false
      })
      .addCase(fetchUserProfile.rejected, () => initialState)
      .addCase(logout.fulfilled, () => initialState)
      .addCase(adminLogin.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export default authSlice.reducer

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api'

// Async thunk for uploading a file
export const uploadFile = createAsyncThunk(
  'file/upload',
  async ({ file, salt, iv, originalName }, { rejectWithValue }) => {
    try {
      const formData = new FormData()
      formData.append('file', file, originalName) // Encrypted file Blob with original name
      formData.append('salt', salt)
      formData.append('iv', iv)
      const response = await api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Upload failed')
    }
  }
)

export const fetchFiles = createAsyncThunk(
  'files/fetchFiles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/files/')
      return response.data.files
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Error fetching files')
    }
  }
)

export const shareFile = createAsyncThunk(
  'file/shareFile',
  async ({ file_id, shareInput, accessType }, { rejectWithValue }) => {
    // Parse the comma-separated usernames and trim them
    const usernames = shareInput
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean)

    if (usernames.length === 0) {
      return rejectWithValue('Please enter at least one username.')
    }

    // Construct the shares array
    const shares = usernames.map((username) => ({
      user: username,
      access_type: accessType,
    }))

    const payload = { shares }

    try {
      const response = await api.post(`/files/${file_id}/userShare/`, payload)
      return response.data // Expecting { message: 'File shared successfully.' }
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Error sharing file.')
    }
  }
)

// Initial state
const initialState = {
  files: [],
  loading: false,
  error: null,
}

// Create Redux slice
const fileSlice = createSlice({
  name: 'file',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(uploadFile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(uploadFile.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchFiles.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        state.loading = false
        state.files = action.payload
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(shareFile.pending, (state) => {
        state.shareMessage = null
        state.shareError = null
      })
      .addCase(shareFile.fulfilled, (state, action) => {
        state.shareMessage =
          action.payload.message || 'File shared successfully.'
      })
      .addCase(shareFile.rejected, (state, action) => {
        state.shareError = action.payload
      })
  },
})

// Export the reducer for store configuration
export default fileSlice.reducer

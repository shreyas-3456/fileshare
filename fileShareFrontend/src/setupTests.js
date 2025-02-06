import { configureStore } from '@reduxjs/toolkit'
import { vi } from 'vitest'
import fileReducer from './store/reducers/fileReducer'
// import authReducer from './store/reducers/authReducer'
import api from './store/api'
import '@testing-library/jest-dom'
// --- Mocks ---

// Mock the uploadFile thunk to resolve with a fake file_id
vi.mock('../store/reducers/fileReducer', async (importOriginal) => {
  const originalModule = await importOriginal()
  return {
    ...originalModule,
    uploadFile: vi.fn(({ file, iv, salt, originalName }) => {
      return async (dispatch) => ({
        meta: { requestStatus: 'fulfilled' },
        payload: { file_id: 1 },
      })
    }),
    fetchFiles: vi.fn(() => {
      return async (dispatch) => ({
        meta: { requestStatus: 'fulfilled' },
        payload: [],
      })
    }),
  }
})

// Mock API calls
vi.mock('../store/api', () => ({
  default: {
    post: vi.fn((url, payload) => {
      return Promise.resolve({
        data: {
          public_url: 'dummy-public-token',
          expires: '2025-01-01T00:00:00Z',
        },
      })
    }),
    get: vi.fn(() => Promise.resolve({ data: {} })),
  },
}))

// Mock clipboard functionality
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

if (!window.crypto || !window.crypto.subtle) {
  try {
    // For Node 17+ (or if you install node-webcrypto-ossl or similar), you can do:
    const { webcrypto } = require('crypto')
    window.crypto = webcrypto
  } catch (e) {
    console.error('Web Crypto API is not available in your test environment.')
  }
}

if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = reject
      reader.onload = () => {
        resolve(reader.result)
      }
      reader.readAsArrayBuffer(this)
    })
  }
}
// --- Test Store Setup ---
export const createTestStore = (customState = {}) => {
  const preloadedState = {
    auth: {
      user: { username: 'testuser', email: 'testuser@example.com' },
      email: 'testuser@example.com',
    },
    file: {
      loading: false,
      error: null,
      files: [],
      shareMessage: '',
      shareError: '',
    },
    ...customState,
  }

  return configureStore({
    reducer: { auth: authReducer, file: fileReducer },
    preloadedState,
  })
}

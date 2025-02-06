import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import AdminPanel from './AdminPanel'
import authReducer from '../store/reducers/userReducer'
import fileReducer from '../store/reducers/fileReducer'
import api from '../store/api'

// --- Setup Test Store ---
const preloadedState = {
  auth: { user: { username: 'admin', email: 'admin@example.com' } },
  file: { loading: false, error: null, files: [] },
}

const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer, file: fileReducer },
    preloadedState,
  })
let shouldFailAdminFiles = false
// --- Mocks ---
// Override api.get to simulate fetching admin files.
vi.mock('../store/api', () => ({
  default: {
    get: vi.fn((url, config) => {
      if (shouldFailAdminFiles) {
        return Promise.reject({
          response: {
            data: { error: 'Test error: unable to fetch admin files.' },
          },
        })
      }
      if (url === '/admin/files/') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              file_name: 'file1.pdf',
              owner: 'user1',
              shared_with: ['user2', 'user3'],
              uploaded_at: '2023-01-01T12:00:00Z',
            },
            {
              id: 2,
              file_name: 'file2.pdf',
              owner: 'user2',
              shared_with: [],
              uploaded_at: '2023-01-02T15:30:00Z',
            },
          ],
        })
      }
      return Promise.resolve({ data: {} })
    }),
  },
}))

describe('AdminPanel Component', () => {
  let store

  beforeEach(() => {
    store = createTestStore()
    shouldFailAdminFiles = false
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <AdminPanel />
        </MemoryRouter>
      </Provider>
    )
  }

  it('renders loading state initially', async () => {
    // Override the store so that loading is true.
    store = configureStore({
      reducer: { auth: authReducer, file: fileReducer },
      preloadedState: {
        auth: { user: { username: 'admin', email: 'admin@example.com' } },
        file: { loading: true, error: null, files: [] },
      },
    })
    renderComponent()
    expect(screen.getByText(/Loading files/i)).toBeInTheDocument()
  })

  it('renders error message when error exists', async () => {
    // Override store with an error state.
    shouldFailAdminFiles = true
    store = configureStore({
      reducer: { auth: authReducer, file: fileReducer },
      preloadedState: {
        auth: { user: { username: 'admin', email: 'admin@example.com' } },
        file: { loading: false, error: 'Error fetching files.', files: [] },
      },
    })
    renderComponent()
    expect(await screen.findByText(/Test error/i)).toBeInTheDocument()
  })

  it('renders a table with file data for admin', async () => {
    renderComponent()

    // Wait for the files to be fetched and rendered.
    await waitFor(() => {
      // Check that file names appear in the table.
      expect(screen.getByText('file1.pdf')).toBeInTheDocument()
      expect(screen.getByText('file2.pdf')).toBeInTheDocument()
    })

    // Check for owner and shared_with data.
    expect(screen.getByText('user1')).toBeInTheDocument()
    expect(screen.getByText('user2, user3')).toBeInTheDocument()
    // Convert the uploaded_at date to local string format.
    const uploadedAt1 = new Date('2023-01-01T12:00:00Z').toLocaleString()
    expect(screen.getByText(uploadedAt1)).toBeInTheDocument()
  })
})

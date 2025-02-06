// adminLogin.test.jsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'

// Import the reducer and the thunk action (we'll override adminLogin below)
import authReducer, { adminLogin } from '../store/reducers/userReducer'
import AdminLogin from './AdminLogin'

// --- Mock the adminLogin async thunk ---
// When dispatched, adminLogin will resolve with a fulfilled action.
vi.mock('../store/reducers/userReducer', async () => {
  // Preserve the original reducer (if needed)
  const actualModule = await vi.importActual('../store/reducers/userReducer')
  return {
    ...actualModule,
    adminLogin: vi.fn((credentials) => {
      return () => Promise.resolve({ meta: { requestStatus: 'fulfilled' } })
    }),
  }
})

// --- Mock useNavigate from react-router-dom ---
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// --- Setup a test Redux store ---
const preloadedState = {
  auth: {
    loading: false,
    error: null,
    // user is null since we're not logged in yet
    user: null,
  },
}

const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState,
  })

describe('adminLogin Component', () => {
  let store

  beforeEach(() => {
    store = createTestStore()
    vi.clearAllMocks()
  })

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/admin-login']}>
          <Routes>
            <Route path='/admin-login' element={<AdminLogin />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )

  it('renders the login form', () => {
    renderComponent()
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument()
  })

  it('dispatches adminLogin and navigates on successful login', async () => {
    renderComponent()
    const usernameInput = screen.getByPlaceholderText(/Username/i)
    const passwordInput = screen.getByPlaceholderText(/Password/i)

    // Simulate user typing
    await userEvent.type(usernameInput, 'adminuser')
    await userEvent.type(passwordInput, 'adminpass')

    // Click the login button.
    const loginButton = screen.getByRole('button', { name: /Login/i })
    await userEvent.click(loginButton)

    // Wait for the async action to resolve and navigation to be triggered.
    await waitFor(() => {
      expect(adminLogin).toHaveBeenCalledWith({
        username: 'adminuser',
        password: 'adminpass',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/admin')
    })
  })

  it('displays error message when an error exists', () => {
    // Create a store with an error in auth state.
    store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: { loading: false, error: 'Login failed', user: null },
      },
    })
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/admin-login']}>
          <Routes>
            <Route path='/admin-login' element={<AdminLogin />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )
    expect(screen.getByText(/Login failed/i)).toBeInTheDocument()
  })
})

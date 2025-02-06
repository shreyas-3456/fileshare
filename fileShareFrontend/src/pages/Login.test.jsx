// Login.test.jsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../store/reducers/userReducer'
import fileReducer from '../store/reducers/fileReducer'
import Login from './Login'

// --- Mock useNavigate ---
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// --- Mock the login thunk from userReducer ---
// This mock simulates a two-phase login:
// - When no MFA code is provided, it returns a payload indicating that an MFA code was sent.
// - When an MFA code is provided, it simulates a successful login.
vi.mock('../store/reducers/userReducer', async () => {
  const originalModule = await vi.importActual('../store/reducers/userReducer')
  return {
    ...originalModule,
    login: vi.fn((credentials) => {
      return async (dispatch) => {
        if (!credentials.email_code) {
          // Simulate that an MFA code is sent.
          return {
            meta: { requestStatus: 'fulfilled' },
            payload: { message: 'MFA code sent to your email.' },
          }
        } else {
          // Simulate successful login when MFA code is provided.
          return {
            meta: { requestStatus: 'fulfilled' },
            payload: {
              user: { username: credentials.username },
              message: 'Login successful',
            },
          }
        }
      }
    }),
  }
})

// --- Helper to create a test Redux store ---
const createTestStore = (preloadedAuthState) =>
  configureStore({
    reducer: { auth: authReducer, file: fileReducer },
    preloadedState: {
      auth: preloadedAuthState,
      file: { loading: false, error: null, files: [] },
    },
  })

describe('Login Component', () => {
  let store

  beforeEach(() => {
    // Clear mocks before each test.
    vi.clearAllMocks()
  })

  it('renders username and password inputs when MFA is not required', () => {
    const preloadedAuthState = {
      user: null,
      email: null,
      reciveCode: false, // MFA not required
      loading: false,
      error: null,
    }
    store = createTestStore(preloadedAuthState)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Enter MFA Code/i)).toBeNull()
  })

  it('renders MFA input when reciveCode is true', async () => {
    const preloadedAuthState = {
      user: null,
      email: null,
      reciveCode: true, // MFA required
      loading: false,
      error: null,
    }
    store = createTestStore(preloadedAuthState)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    )

    expect(screen.queryByPlaceholderText(/Username/i)).toBeNull()
    expect(screen.queryByPlaceholderText(/Password/i)).toBeNull()
    expect(screen.getByPlaceholderText(/Enter MFA Code/i)).toBeInTheDocument()
  })

  it('navigates to "/" after successful MFA login', async () => {
    // Use preloaded state where MFA is required.
    const preloadedAuthState = {
      user: 'dummy',
      email: 'dummy@email.com',
      reciveCode: true,
      loading: false,
      error: null,
    }
    store = createTestStore(preloadedAuthState)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    )
    const mfaInput = screen.getByPlaceholderText(/Enter MFA Code/i)
    await userEvent.type(mfaInput, '123456')

    const loginButton = screen.getByRole('button', { name: /Login/i })
    await userEvent.click(loginButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
    // Expect MFA input to be present.
  })
})

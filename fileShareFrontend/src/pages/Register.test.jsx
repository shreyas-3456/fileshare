import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import Register from './Register'
import authReducer from '../store/reducers/userReducer'
import fileReducer from '../store/reducers/fileReducer'

// --- Mock the register thunk ---
// This mock simulates a two-case scenario:
// - If the username is "error", registration fails with an error payload.
// - Otherwise, registration succeeds.
vi.mock('../store/reducers/userReducer', async () => {
  const originalModule = await vi.importActual('../store/reducers/userReducer')
  return {
    ...originalModule,
    register: vi.fn((userData) => {
      return async (dispatch) => {
        return {
          meta: { requestStatus: 'fulfilled' },
          payload: { message: 'User registered successfully' },
        }
      }
    }),
  }
})

// --- Setup Test Redux Store ---
const preloadedState = {
  auth: {
    user: null,
    email: null,
    reciveCode: false,
    loading: false,
    error: null,
  },
  file: { loading: false, error: null, files: [] },
}

const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer, file: fileReducer },
    preloadedState,
  })

describe('Register Component', () => {
  let store

  beforeEach(() => {
    store = createTestStore()
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <Register />
      </Provider>
    )
  }

  it('renders input fields and register button', () => {
    renderComponent()
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Register/i })
    ).toBeInTheDocument()
  })

  it('dispatches register thunk with correct data on form submission (successful registration)', async () => {
    renderComponent()

    const usernameInput = screen.getByPlaceholderText(/Username/i)
    const emailInput = screen.getByPlaceholderText(/Email/i)
    const passwordInput = screen.getByPlaceholderText(/Password/i)
    const retypePassword = screen.getByPlaceholderText(/Retype Password/i)
    const registerButton = screen.getByRole('button', { name: /Register/i })

    // Simulate user input using async userEvent methods.
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.type(emailInput, 'testuser@example.com')
    await userEvent.type(passwordInput, 'TestPass123!')
    await userEvent.type(retypePassword, 'TestPass123!')

    await userEvent.click(registerButton)

    // Wait for the register thunk to complete by checking that no error is shown.
    await waitFor(() => {
      expect(screen.queryByText(/Error:/i)).toBeNull()
    })
  })
})

describe('Registration failure', () => {
  let store
  const createTestStore = () =>
    configureStore({
      reducer: { auth: authReducer, file: fileReducer },
      preloadedState,
    })
  const preloadedState = {
    auth: {
      user: null,
      email: null,
      reciveCode: false,
      loading: false,
      error: { details: 'Username already exists' },
    },
    file: { loading: false, error: null, files: [] },
  }
  beforeEach(() => {
    store = createTestStore()
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <Register />
      </Provider>
    )
  }
  it('shows error message when registration fails', () => {
    // Create a store with a custom error state.

    // Now render your component with the custom store:
    renderComponent()

    // Assert that the error message appears.
    expect(screen.getByText(/Username already exists/i)).toBeInTheDocument()
  })
})

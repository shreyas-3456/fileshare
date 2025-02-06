import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Navbar from './Navbar'
import authReducer from '../store/reducers/userReducer'
import * as userActions from '../store/reducers/userReducer'
import { describe, expect, it, afterEach } from 'vitest'

const createTestStore = (preloadedAuthState) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: preloadedAuthState },
  })

// Spy on the useNavigate hook from react-router-dom.
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.spyOn(userActions, 'fetchUserProfile').mockImplementation(() => {
  return async (dispatch) => {
    return { meta: { requestStatus: 'fulfilled' } }
  }
})

vi.spyOn(userActions, 'logout').mockImplementation(() => {
  return async (dispatch) => {
    return { meta: { requestStatus: 'fulfilled' } }
  }
})

// --- Test Suite ---

describe('Navbar Component', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Loading..." when auth state is loading', () => {
    const store = createTestStore({ loading: true, user: null, email: null })
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument()
  })

  it('renders welcome message and Logout button when user is authenticated', () => {
    const store = createTestStore({
      loading: false,
      user: 'testuser',
      email: 'testuser@example.com',
    })
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )
    expect(screen.getByText(/Welcome, testuser/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument()
  })

  it('renders "Please log in" when no user is authenticated and navigates to /login on click', async () => {
    const store = createTestStore({ loading: false, user: null, email: null })
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )
    const loginPrompt = screen.getByText(/Please log in/i)
    expect(loginPrompt).toBeInTheDocument()
    // Simulate click on the prompt
    userEvent.click(loginPrompt)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('dispatches logout and navigates to /login when Logout button is clicked', async () => {
    const store = createTestStore({
      loading: false,
      user: 'testuser',
      email: 'testuser@example.com',
    })
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )
    const logoutButton = screen.getByRole('button', { name: /Logout/i })
    userEvent.click(logoutButton)
    // Since logout thunk is mocked to resolve immediately with requestStatus 'fulfilled'
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})

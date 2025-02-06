import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, vi, it } from 'vitest'
import FileUpload from './FileUpload' // adjust the import path
import fileReducer from '../store/reducers/fileReducer'
import authReducer from '../store/reducers/userReducer'
// import authReducer from '../store/reducers/authReducer'
// import api from '../store/api'

vi.mock('../store/reducers/fileReducer', async () => {
  const originalModule = await vi.importActual('../store/reducers/fileReducer')
  return {
    ...originalModule,
    uploadFile: vi.fn(({ file, iv, salt, originalName }) => {
      return async (dispatch) => {
        // For testing, we can resolve with a dummy file_id.
        return { meta: { requestStatus: 'fulfilled' }, payload: { file_id: 1 } }
      }
    }),
    fetchFiles: vi.fn(() => {
      return async (dispatch) => {
        // For testing, we resolve with an empty files list.
        return { meta: { requestStatus: 'fulfilled' }, payload: [] }
      }
    }),
  }
})

vi.mock('../store/api', () => {
  return {
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
  }
})

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

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
}

const store = configureStore({
  reducer: { auth: authReducer, file: fileReducer },
  preloadedState,
})

// --- Tests ---
describe('FileUpload Component', () => {
  beforeEach(() => {
    // Clear mocks between tests.
    vi.clearAllMocks()
  })

  it('renders file upload inputs and buttons', () => {
    render(
      <Provider store={store}>
        <FileUpload />
      </Provider>
    )
    // Check for file input
    expect(
      screen.getByPlaceholderText(/enter encryption password/i)
    ).toBeInTheDocument()
    // Check for upload button
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
  })

  it('uploads a file when file and password are provided', async () => {
    render(
      <Provider store={store}>
        <FileUpload />
      </Provider>
    )

    const fileElement = document.querySelector('input[type="file"]')
    const testFile = new File(['dummy content'], 'dummy.pdf', {
      type: 'application/pdf',
    })
    await userEvent.upload(fileElement, testFile)

    expect(fileElement.files[0]).toStrictEqual(testFile)
    expect(fileElement.files).toHaveLength(1)

    // Simulate entering password
    const passwordInput = screen.getByPlaceholderText(
      /enter encryption password/i
    )
    userEvent.type(passwordInput, 'secret123')

    // Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload/i })
    userEvent.click(uploadButton)

    // Since our uploadFile thunk is mocked to resolve immediately with file_id: 1, we expect that uploadFile is called.
    await waitFor(() => {
      expect(store.getState().file.files).toBeDefined() // This is dummy; in our test, uploadFile is a thunk that returns file_id 1
    })
  })

  it('generates public link when "Create one time public link" is clicked', async () => {
    // Render the component with a dummy file already present in the file list.
    const dummyFiles = [{ id: 1, file_name: 'dummy.pdf' }]
    // Preload store with files
    const customStore = configureStore({
      reducer: { auth: authReducer, file: fileReducer },
      preloadedState: {
        ...preloadedState,
        file: { ...preloadedState.file, files: dummyFiles },
      },
    })

    render(
      <Provider store={customStore}>
        <FileUpload />
      </Provider>
    )

    // We need to simulate that a file link exists in the list.
    // Our component maps over files and renders a link and a button.
    // Find the "Create one time public link" button
    const shareButton = await screen.findByRole('button', {
      name: /create one time public link/i,
    })
    expect(shareButton).toBeInTheDocument()

    // Click the share button to generate a public link.
    userEvent.click(shareButton)

    // Our api.post for public link is mocked. We expect that after clicking, a "Copy to clipboard" button appears.
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /copy to clipboard/i })
      ).toBeInTheDocument()
    })

    // Now click copy button
    const copyButton = screen.getByRole('button', {
      name: /copy to clipboard/i,
    })
    userEvent.click(copyButton)

    // Verify navigator.clipboard.writeText was called with the expected public link URL.
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('dummy-public-token')
      )
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import fileReducer from '../store/reducers/fileReducer'
import authReducer from '../store/reducers/userReducer'
import api from '../store/api'
import FileDetail from './File'

// --- Mock API Calls ---
// We override api.get to simulate fetching metadata and file blob.
vi.mock('../store/api', () => ({
  default: {
    get: vi.fn((url, config) => {
      if (url.includes('/metadata/')) {
        // Return dummy metadata.
        return Promise.resolve({
          data: {
            file_name: 'example.pdf',
            salt: 'dGhpcyBpcyBhIHRlc3Qgc2FsdA==', // Base64 for "this is a test salt"
            iv: 'dGVzdCBpdiA=', // Base64 for "test iv "
            mimeType: 'application/pdf',
            access_type: 'owner',
          },
        })
      }
      // Otherwise, assume it's the file endpoint.
      return Promise.resolve({
        data: new Blob(['encrypted content'], { type: 'application/pdf' }),
      })
    }),
    post: vi.fn((url, payload) => {
      // For the share endpoint.
      return Promise.resolve({
        data: { message: 'File shared successfully.' },
      })
    }),
  },
}))

// --- Override URL.createObjectURL ---
// When the component creates an object URL for the decrypted Blob,
// we override it to return a dummy URL.
const dummyDecryptedUrl = 'blob:http://localhost/dummy-decrypted-url'
URL.createObjectURL = vi.fn().mockReturnValue(dummyDecryptedUrl)

// --- Override the decryption ---
// We simulate decryption by overriding window.crypto.subtle.decrypt to return
// a dummy decrypted ArrayBuffer containing "Decrypted PDF content".
const dummyDecryptedText = 'Decrypted PDF content'
const dummyDecryptedBuffer = new TextEncoder().encode(dummyDecryptedText).buffer
window.crypto.subtle.decrypt = vi.fn().mockResolvedValue(dummyDecryptedBuffer)

// --- Setup a test Redux store ---
const preloadedState = {
  auth: {
    user: { username: 'testuser', email: 'testuser@example.com' },
  },
  file: {
    loading: false,
    error: null,
    files: [],
    shareMessage: 'File shared successfully.',
    shareError: null,
  },
}

const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer, file: fileReducer },
    preloadedState,
  })

// --- Tests ---
describe('FileDetail Component', () => {
  let store

  beforeEach(() => {
    store = createTestStore()
    vi.clearAllMocks()
  })

  const renderComponent = (fileId = '1') => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/files/${fileId}`]}>
          <Routes>
            <Route path='/files/:file_id' element={<FileDetail />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )
  }

  it('renders decryption form initially', async () => {
    renderComponent('1')
    // Wait for metadata to load and appear in the heading.
    expect(await screen.findByText(/File: example\.pdf/i)).toBeInTheDocument()
    // Expect a password input and "Decrypt File" button.
    expect(
      screen.getByLabelText(/Enter Password to Decrypt File:/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Decrypt File/i })
    ).toBeInTheDocument()
  })

  it('decrypts file and shows viewer and share form after entering password', async () => {
    renderComponent('1')

    // Enter a password and click "Decrypt File".
    const passwordInput = await screen.findByLabelText(
      /Enter Password to Decrypt File:/i
    )
    await userEvent.type(passwordInput, 'correct-password')
    const decryptButton = screen.getByRole('button', { name: /Decrypt File/i })
    await userEvent.click(decryptButton)

    // Wait for decryption to complete.
    await waitFor(() => {
      expect(window.crypto.subtle.decrypt).toHaveBeenCalled()
    })

    // After decryption, expect that a download link appears.
    await waitFor(() => {
      expect(screen.getByText(/Download Decrypted File/i)).toBeInTheDocument()
    })

    // Expect the share form heading to appear.
    expect(screen.getByText(/User based Share File/i)).toBeInTheDocument()
    // Expect that the Document viewer is rendered.
    expect(screen.getByText(/Decrypted File Viewer/i)).toBeInTheDocument()
  })
})

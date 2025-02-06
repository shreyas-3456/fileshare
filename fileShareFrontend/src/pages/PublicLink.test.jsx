import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findByTestId,
  getByTestId,
  getByText,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import fileReducer from '../store/reducers/fileReducer'
import authReducer from '../store/reducers/userReducer'

import PublicLink from './PublicLink'

// --- Mock API Calls ---
import axios from 'axios'
vi.mock('react-pdf', () => ({
  Document: ({ file, children, loading }) => (
    <div data-testid='document'>{children}</div>
  ),
  Page: ({ pageNumber }) => <div data-testid='page'>Page {pageNumber}</div>,
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  },
}))
// Mock the entire axios module
vi.mock('axios', () => ({
  default: {
    get: vi.fn((url, config) => {
      // Return a metadata response if the URL includes '/metadata/'
      if (url.includes('/metadata/')) {
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
      // For file endpoint: return a dummy encrypted Blob.
      return Promise.resolve({
        data: new Blob(['encrypted content'], { type: 'application/pdf' }),
      })
    }),
    post: vi.fn((url, payload) => {
      return Promise.resolve({
        data: {
          public_url: 'dummy-public-token',
          expires: '2025-01-01T00:00:00Z',
        },
      })
    }),
  },
}))

// --- Override URL.createObjectURL ---
globalThis.URL.createObjectURL = vi.fn(
  () => 'blob:http://localhost/dummy-decrypted-url'
)

// --- Override window.crypto.subtle.decrypt ---
// Simulate decryption by returning a dummy ArrayBuffer containing "Decrypted PDF content"
const dummyDecryptedText = 'Decrypted PDF content'
const dummyDecryptedBuffer = new TextEncoder().encode(dummyDecryptedText).buffer
window.crypto.subtle.decrypt = vi.fn().mockResolvedValue(dummyDecryptedBuffer)

describe('PublicLink Component', () => {
  let store
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (fileId = '1') => {
    return render(
      <MemoryRouter initialEntries={[`/files/${fileId}`]}>
        <Routes>
          <Route path='/files/:file_id' element={<PublicLink />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders decryption form initially', async () => {
    renderComponent('1')
    expect(await screen.findByText(/File: example\.pdf/i)).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Enter Password to Decrypt:/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Decrypt File/i })
    ).toBeInTheDocument()
  })

  it('decrypts file and shows viewer and share form after entering password', async () => {
    renderComponent('1')
    // Simulate decryption first.
    const passwordInput = await screen.findByLabelText(
      /Enter Password to Decrypt:/i
    )
    await userEvent.type(passwordInput, 'correct-password')
    const decryptButton = screen.getByRole('button', {
      name: /Decrypt File/i,
    })
    await userEvent.click(decryptButton)

    await waitFor(
      () => {
        expect(screen.getByText(/Page/)).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })
})

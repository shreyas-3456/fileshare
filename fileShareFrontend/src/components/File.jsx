import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import api from '../store/api' //
import { useDispatch, useSelector } from 'react-redux'
import { shareFile } from '../store/reducers/fileReducer'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// Utility: Derive an AES-GCM key from password using PBKDF2
async function deriveKey(password, saltBase64) {
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0))
  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  )
}

// Utility: Decrypt the encrypted Blob using AES-GCM
async function decryptBlob(
  encryptedBlob,
  password,
  saltBase64,
  ivBase64,
  mimeType = 'application/pdf'
) {
  // Derive key from password and salt
  const key = await deriveKey(password, saltBase64)

  // Convert the Base64 IV to a Uint8Array
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0))

  // Convert the encrypted Blob to an ArrayBuffer
  const encryptedBuffer = await encryptedBlob.arrayBuffer()

  // Decrypt the encrypted data using AES-GCM
  let decryptedBuffer
  try {
    decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBuffer
    )
  } catch (error) {
    throw new Error('Decryption failed. Please check your password.')
  }

  // Convert the decrypted ArrayBuffer to a Blob
  return new Blob([new Uint8Array(decryptedBuffer)], { type: mimeType })
}

const FileDetail = () => {
  const { file_id } = useParams()
  const dispatch = useDispatch() // Get file_id from URL
  const [encryptedBlob, setEncryptedBlob] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [password, setPassword] = useState('')
  const [decryptedUrl, setDecryptedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [shareInput, setShareInput] = useState('') // Comma-separated usernames
  const [accessType, setAccessType] = useState('view') // default access type
  const shareMessage = useSelector((state) => state.file.shareMessage)
  const shareError = useSelector((state) => state.file.shareError)

  const handleShareSubmit = (e) => {
    e.preventDefault()
    dispatch(shareFile({ file_id, shareInput, accessType }))
  }

  // Fetch file metadata and encrypted file on mount
  useEffect(() => {
    const fetchFileData = async () => {
      try {
        // Fetch metadata: expects JSON with salt, iv, mimeType, file_name
        const metaResponse = await api.get(`/files/${file_id}/metadata/`)
        setMetadata(metaResponse.data)

        // Fetch the encrypted file as a blob
        const fileResponse = await api.get(`/files/${file_id}/`, {
          responseType: 'blob',
        })
        setEncryptedBlob(fileResponse.data)
      } catch (err) {
        setError('Error fetching file data.')
      } finally {
        setLoading(false)
      }
    }

    fetchFileData()
  }, [file_id])

  // Handle decryption when password is provided
  const handleDecrypt = async (e) => {
    e.preventDefault()
    if (!encryptedBlob || !metadata || !password) {
      setError('Missing encrypted file, metadata, or password.')
      return
    }
    try {
      const decryptedBlob = await decryptBlob(
        encryptedBlob,
        password,
        metadata.salt,
        metadata.iv,
        metadata.mimeType || 'application/pdf'
      )
      const url = URL.createObjectURL(decryptedBlob)
      setDecryptedUrl(url)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>Loading file...</p>

  return (
    <div>
      <h2>File: {metadata ? metadata.file_name : 'Unknown'}</h2>
      {!decryptedUrl ? (
        <form onSubmit={handleDecrypt}>
          <label>
            Enter Password to Decrypt File:
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type='submit'>Decrypt File</button>
          {error && !decryptedUrl && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      ) : (
        <div>
          {metadata.access_type !== 'view' && (
            <>
              <a href={decryptedUrl} download={metadata.file_name}>
                Download Decrypted File
              </a>

              <div style={{ marginTop: '20px' }}>
                <h3>User based Share File</h3>
                <form onSubmit={handleShareSubmit}>
                  <div>
                    <label>
                      Usernames (comma-separated):
                      <input
                        type='text'
                        value={shareInput}
                        onChange={(e) => setShareInput(e.target.value)}
                        placeholder='e.g., alice,bob'
                        required
                      />
                    </label>
                  </div>
                  <div>
                    <label>
                      Access Type:
                      <select
                        value={accessType}
                        onChange={(e) => setAccessType(e.target.value)}
                      >
                        <option value='view'>View</option>
                        <option value='download'>Download</option>
                      </select>
                    </label>
                  </div>
                  <button type='submit'>Share File</button>
                </form>
                {shareMessage && (
                  <p style={{ color: 'green' }}>{shareMessage}</p>
                )}
                {shareError && <p style={{ color: 'red' }}>{shareError}</p>}
              </div>
            </>
          )}
          <h3>Decrypted File Viewer</h3>
          <Document file={decryptedUrl}>
            <Page pageNumber={1} />
          </Document>
        </div>
      )}
    </div>
  )
}

export default FileDetail

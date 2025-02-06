import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

// Set up PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// Utility: Derive an AES-GCM key from a password using PBKDF2
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
async function decryptFile(
  encryptedBlob,
  password,
  saltBase64,
  ivBase64,
  mimeType = 'application/pdf'
) {
  // Derive the key using the password and salt
  const key = await deriveKey(password, saltBase64)

  // Convert the Base64-encoded IV to a Uint8Array
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0))

  // Convert the encrypted Blob to an ArrayBuffer
  const encryptedBuffer = await encryptedBlob.arrayBuffer()

  // Decrypt the file using AES-GCM
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

  // Return a Blob containing the decrypted data
  return new Blob([new Uint8Array(decryptedBuffer)], { type: mimeType })
}

const PublicFileAccess = () => {
  const { public_token } = useParams() // Get the public token from the URL
  const [metadata, setMetadata] = useState(null)
  const [encryptedBlob, setEncryptedBlob] = useState(null)
  const [password, setPassword] = useState('')
  // Instead of keeping the Blob, we will keep an object URL for the decrypted file.
  const [decryptedUrl, setDecryptedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const viewerRef = useRef(null)

  // Fetch file metadata and blob
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `https://localhost:8000/api/public/files/${public_token}/metadata/`
        )
        setMetadata(response.data)
        const file = await axios.get(
          `https://localhost:8000/api/public/files/${public_token}/`,
          { responseType: 'blob' }
        )
        setEncryptedBlob(file.data)
        setLoading(false)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch file metadata.')
        setLoading(false)
      }
    }
    fetchData()
  }, [public_token])

  // Handle the decryption process when the user submits the password
  const handleDecrypt = async (e) => {
    e.preventDefault()
    if (!encryptedBlob || !metadata || !password) {
      setError('Missing encrypted file, metadata, or password.')
      return
    }
    try {
      const decryptedBlob = await decryptFile(
        encryptedBlob,
        password,
        metadata.salt,
        metadata.iv,
        metadata.mimeType || 'application/pdf'
      )
      // Create an object URL from the decrypted Blob.
      const url = URL.createObjectURL(decryptedBlob)

      setDecryptedUrl(url)

      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>Loading file data...</p>
  if (error && !decryptedUrl) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <h2>File: {metadata ? metadata.file_name : 'Public File'}</h2>
      {!decryptedUrl ? (
        <form onSubmit={handleDecrypt}>
          <label>
            {decryptedUrl}
            Enter Password to Decrypt:
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type='submit'>Decrypt File</button>
        </form>
      ) : (
        <div
          ref={viewerRef}
          // Disable right-click and text selection on the viewer container
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <h3>Decrypted File</h3>
          <Document file={decryptedUrl} loading='Loading PDF...'>
            <Page pageNumber={1} />
          </Document>
          {/* Optional overlay to block interactions */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'transparent',
              zIndex: 10,
            }}
          />
        </div>
      )}
    </div>
  )
}

export default PublicFileAccess

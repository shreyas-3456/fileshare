import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchFiles, uploadFile } from '../store/reducers/fileReducer'
import api from '../store/api'

// Utility function to derive an AES-GCM key from a password using PBKDF2
async function deriveKey(password, salt) {
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
      salt, // Uint8Array
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Utility function to encrypt a file (as a Blob) using AES-GCM
async function encryptFile(file, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))

  const key = await deriveKey(password, salt)

  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  const fileBuffer = await file.arrayBuffer()

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  )

  // Create a Blob from the encrypted data (preserve file type)
  const encryptedBlob = new Blob([new Uint8Array(encryptedBuffer)], {
    type: file.type,
  })

  // Convert salt and iv to Base64 strings so they can be sent in FormData
  const saltBase64 = btoa(String.fromCharCode(...salt))
  const ivBase64 = btoa(String.fromCharCode(...iv))

  return { encryptedBlob, saltBase64, ivBase64 }
}

const FileUpload = () => {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('') // New state for password
  const dispatch = useDispatch()
  const { loading, error, files } = useSelector((state) => state.file)
  const { user, email } = useSelector((state) => state.auth)
  const [publicLink, setPublicLink] = useState('')
  const [showCopy, setShowCopy] = useState([])
  const onFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const onPasswordChange = (e) => {
    setPassword(e.target.value)
  }

  const onUpload = async () => {
    if (!file || !password) {
      alert('Please select a file and enter a password.')
      return
    }

    try {
      const { encryptedBlob, saltBase64, ivBase64 } = await encryptFile(
        file,
        password
      )

      dispatch(
        uploadFile({
          file: encryptedBlob,
          iv: ivBase64,
          salt: saltBase64,
          originalName: file.name,
        })
      )
    } catch (err) {
      console.error('Encryption failed:', err)
    }
  }
  const generatePublicLink = async (fileId) => {
    try {
      const response = await api.post(`files/${fileId}/share/`)

      setPublicLink(response.data.public_url)
      setShowCopy((prev) => {
        return [...prev, fileId]
      })
    } catch (err) {
      console.error(err)
    }
  }
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.href}view/${publicLink}`
      )
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }
  // Fetch files on mount (if needed)
  useEffect(() => {
    dispatch(fetchFiles())
  }, [dispatch])

  if (user || email) {
    return (
      <div>
        <h2>Upload File</h2>
        <input type='file' onChange={onFileChange} />
        <input
          type='password'
          placeholder='Enter encryption password'
          value={password}
          onChange={onPasswordChange}
        />
        <button onClick={onUpload} disabled={loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        <div>
          <h3>Uploaded Files:</h3>
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 0,
              margin: 0,
            }}
          >
            {files.map((file, index) => (
              <>
                <a key={index} href={`/files/${file.id}`}>
                  {file.file_name}
                </a>
                <button onClick={() => generatePublicLink(file.id)}>
                  Create one time public link
                </button>
                {showCopy.includes(file.id) && (
                  <button onClick={copyToClipboard}>Copy to clipboard</button>
                )}
              </>
            ))}
          </ul>
        </div>
      </div>
    )
  }
  return null
}

export default FileUpload

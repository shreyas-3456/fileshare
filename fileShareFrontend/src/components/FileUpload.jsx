import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchFiles, uploadFile } from '../store/reducers/fileReducer'
import api from '../store/api'
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Link as MuiLink,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import WebsiteInfo from './WebsiteInfo'

/* Utility function to derive an AES-GCM key from a password using PBKDF2 */
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

/* Utility function to encrypt a file (as a Blob) using AES-GCM */
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
  const [password, setPassword] = useState('') // for encryption password
  const [publicLink, setPublicLink] = useState('')
  const [showCopy, setShowCopy] = useState([])

  const dispatch = useDispatch()
  const { loading, error, files } = useSelector((state) => state.file)
  const { user, email } = useSelector((state) => state.auth)

  // Handle file input change
  const onFileChange = (e) => {
    setFile(e.target.files[0])
  }
  // Handle encryption password change
  const onPasswordChange = (e) => {
    setPassword(e.target.value)
  }

  // Handle file upload with encryption
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

  // Generate one time public link for a file
  const generatePublicLink = async (fileId) => {
    try {
      const response = await api.post(`files/${fileId}/share/`)
      setPublicLink(response.data.public_url)
      setShowCopy((prev) => [...prev, fileId])
    } catch (err) {
      console.error(err)
    }
  }

  // Copy the public link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.href}view/${publicLink}`
      )
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  // Fetch files on mount
  useEffect(() => {
    if (user || email) {
      dispatch(fetchFiles())
    }
  }, [dispatch, user, email])

  // Only render for authenticated users
  if (!(user || email)) {
    return <WebsiteInfo />
  }

  return (
    <Box
      sx={{
        minHeight: '92vh',
        minWidth: '600px',
        width: '100%',
        background: 'linear-gradient(135deg, #F5F7FA, #C3CFE2)',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 'unset',
      }}
      style={{ width: '100%' }}
    >
      <Container style={{ minWidth: 'max-content' }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            border: '2px solid #1976d2',
            borderRadius: '12px',
          }}
          style={{ minWidth: '400px' }}
        >
          <Typography variant='h4' align='center' gutterBottom>
            Upload File
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mb: 3,
            }}
          >
            {/* File input using a styled Button */}
            <Button variant='contained' component='label'>
              {file ? `File Selected: ${file.name}` : 'Choose File'}
              <input type='file' hidden onChange={onFileChange} />
            </Button>
            <TextField
              label='Encryption Password'
              type='password'
              variant='outlined'
              fullWidth
              value={password}
              onChange={onPasswordChange}
              required
            />
            <Button
              variant='contained'
              color='primary'
              onClick={onUpload}
              disabled={loading}
              sx={{ py: 1.5 }}
            >
              {loading ? (
                <CircularProgress size={24} color='inherit' />
              ) : (
                'Upload'
              )}
            </Button>
            {error && (
              <Typography variant='body2' color='error'>
                Error: {error}
              </Typography>
            )}
          </Box>
          <Typography variant='h5' gutterBottom>
            Uploaded Files:
          </Typography>
          {files && files.length > 0 ? (
            <List>
              {files.map((file) => (
                <ListItem key={file.id} divider>
                  <ListItemText
                    primary={
                      <MuiLink
                        component={RouterLink}
                        to={`/files/${file.id}`}
                        underline='hover'
                        style={{ marginRight: '8px' }}
                      >
                        {file.file_name}
                      </MuiLink>
                    }
                  />
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() => generatePublicLink(file.id)}
                    >
                      Share file with a time public link
                    </Button>
                    {showCopy.includes(file.id) && (
                      <Button
                        variant='outlined'
                        size='small'
                        onClick={copyToClipboard}
                      >
                        Copy to clipboard
                      </Button>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant='body1'>No files uploaded yet.</Typography>
          )}
        </Paper>
      </Container>
    </Box>
  )
}

export default FileUpload

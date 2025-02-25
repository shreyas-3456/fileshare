import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import api from '../store/api'
import { useDispatch, useSelector } from 'react-redux'
import { shareFile } from '../store/reducers/fileReducer'
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Stack,
} from '@mui/material'
import LayoutWrapper from './LayoutWrapper'

// Setup PDF worker
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
  // Return a Blob containing the decrypted data
  return new Blob([new Uint8Array(decryptedBuffer)], { type: mimeType })
}

const FileDetail = () => {
  const { file_id } = useParams()
  const dispatch = useDispatch()

  const [encryptedBlob, setEncryptedBlob] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [password, setPassword] = useState('')
  const [decryptedUrl, setDecryptedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scale, setScale] = useState(1.4)

  const [shareInput, setShareInput] = useState('') // Comma-separated usernames
  const [accessType, setAccessType] = useState('view') // default access type

  const shareMessage = useSelector((state) => state.file.shareMessage)
  const shareError = useSelector((state) => state.file.shareError)

  const handleShareSubmit = (e) => {
    e.preventDefault()
    dispatch(shareFile({ file_id, shareInput, accessType }))
  }

  // Fetch metadata and encrypted file on mount
  useEffect(() => {
    const fetchFileData = async () => {
      try {
        const metaResponse = await api.get(`/files/${file_id}/metadata/`)
        setMetadata(metaResponse.data)

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

  if (loading) {
    return (
      <LayoutWrapper>
        <Box
          sx={{
            minHeight: '92vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #F5F7FA, #C3CFE2)',
          }}
          minWidth={800}
        >
          <CircularProgress />
          <Typography variant='body1' sx={{ ml: 2 }}>
            Loading file...
          </Typography>
        </Box>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <Box
        sx={{
          minHeight: '92vh',
          background: 'linear-gradient(135deg, #F5F7FA, #C3CFE2)',
          p: 2,
          minWidth: '600px',
          width: '100%',
        }}
      >
        <Container>
          <Paper
            elevation={3}
            sx={{
              p: 4,

              borderRadius: '12px',
              minWidth: '100%',
              width: 'max-content',
            }}
          >
            <Typography variant='h4' align='center' gutterBottom>
              File: {metadata ? metadata.file_name : 'Unknown'}
            </Typography>

            {!decryptedUrl ? (
              <Box
                component='form'
                onSubmit={handleDecrypt}
                sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}
              >
                <TextField
                  label='Enter Password to Decrypt File'
                  type='password'
                  variant='outlined'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type='submit' variant='contained' color='primary'>
                  Decrypt File
                </Button>
                {error && (
                  <Typography variant='body2' color='error'>
                    {error}
                  </Typography>
                )}
              </Box>
            ) : (
              <Box sx={{ mb: 3 }}>
                {metadata.access_type !== 'view' && (
                  <Box
                    component='form'
                    onSubmit={handleShareSubmit}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      mt: 3,
                    }}
                  >
                    <Typography variant='h6'>
                      User-based File Sharing
                    </Typography>
                    <TextField
                      label='Usernames (comma-separated)'
                      variant='outlined'
                      value={shareInput}
                      onChange={(e) => setShareInput(e.target.value)}
                      placeholder='e.g., alice,bob'
                      required
                    />
                    <TextField
                      select
                      label='Access Type'
                      value={accessType}
                      onChange={(e) => setAccessType(e.target.value)}
                    >
                      <MenuItem value='view'>
                        View (only available for PDF)
                      </MenuItem>
                      <MenuItem value='download'>Download</MenuItem>
                    </TextField>
                    <Button
                      type='submit'
                      variant='contained'
                      color='primary'
                      style={{ marginBottom: '20px' }}
                    >
                      Share File
                    </Button>
                    {shareMessage && (
                      <Typography variant='body2' color='success.main'>
                        {shareMessage}
                      </Typography>
                    )}
                    {shareError && (
                      <Typography variant='body2' color='error'>
                        {shareError}
                      </Typography>
                    )}
                  </Box>
                )}
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <Button
                    variant='contained'
                    color='secondary'
                    component='a'
                    href={decryptedUrl}
                    download={metadata.file_name}
                  >
                    Download Decrypted File
                  </Button>
                </Box>

                {metadata.mimeType === 'application/pdf' ? (
                  <>
                    {/* Zoom controls for PDF preview */}
                    <Stack
                      direction='row'
                      spacing={2}
                      alignItems='center'
                      justifyContent='center'
                      sx={{ mb: 2 }}
                    >
                      <Button
                        variant='outlined'
                        color='primary'
                        onClick={() =>
                          setScale((prev) => Math.max(prev - 0.25, 0.5))
                        }
                      >
                        Zoom Out
                      </Button>
                      <Button
                        variant='outlined'
                        color='primary'
                        onClick={() =>
                          setScale((prev) => Math.min(prev + 0.25, 2.1))
                        }
                      >
                        Zoom In
                      </Button>
                      <Typography variant='body2'>
                        Scale: {scale.toFixed(2)}
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        border: '1px solid #ddd',
                        p: 1,
                        borderRadius: '4px',
                        textAlign: 'center',
                      }}
                    >
                      <Document file={decryptedUrl}>
                        <Page pageNumber={1} scale={scale} />
                      </Document>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Typography variant='body1' gutterBottom>
                      Preview not available for this file extension.
                    </Typography>
                    <Button
                      variant='contained'
                      color='secondary'
                      component='a'
                      href={decryptedUrl}
                      download={metadata.file_name}
                    >
                      Download File
                    </Button>
                  </Box>
                )}

                {/* Share file form (only if file is not view-only) */}
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </LayoutWrapper>
  )
}

export default FileDetail

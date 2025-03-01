import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material'
import LayoutWrapper from '../components/LayoutWrapper'

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
  const key = await deriveKey(password, saltBase64)
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0))
  const encryptedBuffer = await encryptedBlob.arrayBuffer()
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
  return new Blob([new Uint8Array(decryptedBuffer)], { type: mimeType })
}

const PublicFileAccess = () => {
  const { public_token } = useParams()
  const [metadata, setMetadata] = useState(null)
  const [encryptedBlob, setEncryptedBlob] = useState(null)
  const [password, setPassword] = useState('')
  const [decryptedUrl, setDecryptedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const viewerRef = useRef(null)
  const [scale, setScale] = useState(1.0)

  // Fetch file metadata and blob
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `https://3.227.230.192/api/public/files/${public_token}/metadata/`
        )
        setMetadata(response.data)
        const file = await axios.get(
          `https://3.227.230.192/api/public/files/${public_token}/`,
          { responseType: 'blob' }
        )
        setEncryptedBlob(file.data)
        setLoading(false)
      } catch (err) {
        setError(err.response?.data?.error || 'URL does not exists')
        setLoading(false)
      }
    }
    fetchData()
  }, [public_token])

  // Handle decryption when the user submits the password
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
      const url = URL.createObjectURL(decryptedBlob)
      setDecryptedUrl(url)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  // Zoom control functions (for PDF preview only)
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5))

  // Queue the download when the user clicks the download button
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = decryptedUrl
    link.download = metadata.file_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <Container
        sx={{
          minHeight: '92vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F5F7FA, #C3CFE2)',
        }}
      >
        <CircularProgress />
      </Container>
    )
  }

  if (error && !decryptedUrl) {
    return (
      <LayoutWrapper>
        <Container
          sx={{
            minHeight: '92vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #F5F7FA, #C3CFE2)',
          }}
        >
          <Typography variant='h6' color='error'>
            {error}
          </Typography>
        </Container>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <Container
        sx={{
          py: 4,
          background: 'linear-gradient(135deg, #F5F7FA, #C3CFE2)',
          minHeight: '92vh',
          minWidth: '600px',
          maxWidth: '100vh',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, mx: 'auto', width: 'max-content' }}>
          <Typography variant='h4' gutterBottom>
            File: {metadata ? metadata.file_name : 'Public File'}
          </Typography>
          {!decryptedUrl ? (
            <Box component='form' onSubmit={handleDecrypt} sx={{ mt: 2 }}>
              <TextField
                label='Enter Password to Decrypt'
                type='password'
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <Button variant='contained' color='primary' type='submit'>
                Decrypt File
              </Button>
              {error && (
                <Typography variant='body2' color='error' sx={{ mt: 2 }}>
                  {error}
                </Typography>
              )}
            </Box>
          ) : (
            <Box
              ref={viewerRef}
              sx={{
                mt: 2,
                position: 'relative',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              <Typography variant='h5' gutterBottom>
                Decrypted File Preview
              </Typography>
              {metadata.mimeType === 'application/pdf' ? (
                <>
                  <Stack
                    direction='row'
                    spacing={2}
                    alignItems='center'
                    sx={{ mb: 2 }}
                  >
                    <Button variant='outlined' onClick={zoomOut}>
                      Zoom Out
                    </Button>
                    <Button variant='outlined' onClick={zoomIn}>
                      Zoom In
                    </Button>
                    <Typography variant='body2'>
                      Scale: {scale.toFixed(2)}
                    </Typography>
                    <Button
                      variant='contained'
                      color='secondary'
                      onClick={handleDownload}
                    >
                      Download File
                    </Button>
                  </Stack>
                  <iframe src={decryptedUrl}>
                    {/* <Document file={decryptedUrl} loading='Loading PDF...'>
                    <Page pageNumber={1} scale={scale} />
                    </Document> */}
                  </iframe>
                </>
              ) : (
                <>
                  <Typography variant='body1'>
                    Preview not available for this file type.
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
                </>
              )}
              <Box sx={{ mt: 3 }}></Box>
            </Box>
          )}
        </Paper>
      </Container>
    </LayoutWrapper>
  )
}

export default PublicFileAccess

import React, { useEffect, useState } from 'react'
import api from '../store/api'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material'
import LayoutWrapper from '../components/LayoutWrapper'

const AdminPanel = () => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get('/admin/files/')
        setFiles(response.data)
      } catch (err) {
        setError(err.response?.data?.error || 'Unauthorized')
        setTimeout(() => {
          navigate('/')
        }, 1000)
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [navigate])

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

  if (error) {
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
        <Typography variant='h6' color='error'>
          {error}
        </Typography>
      </Container>
    )
  }

  return (
    <LayoutWrapper>
      <Container sx={{ mt: 4 }}>
        <Typography variant='h4' align='center' gutterBottom>
          Admin Panel - All Files
        </Typography>
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>File Name</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Shared With</TableCell>
                <TableCell>Uploaded At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>{file.id}</TableCell>
                  <TableCell>{file.file_name}</TableCell>
                  <TableCell>{file.owner}</TableCell>
                  <TableCell>
                    {file.shared_with && file.shared_with.length > 0
                      ? file.shared_with.join(', ')
                      : 'None'}
                  </TableCell>
                  <TableCell>
                    {new Date(file.uploaded_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </LayoutWrapper>
  )
}

export default AdminPanel

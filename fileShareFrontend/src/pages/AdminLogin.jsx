import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { adminLogin } from '../store/reducers/userReducer'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material'
import LayoutWrapper from '../components/LayoutWrapper'

const AdminLogin = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector((state) => state.auth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    dispatch(adminLogin({ username, password })).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        navigate('/admin')
      }
    })
  }

  return (
    <LayoutWrapper>
      <Container maxWidth='sm' sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant='h4' align='center' gutterBottom>
            Admin Login
          </Typography>
          <Box
            component='form'
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label='Username'
              variant='outlined'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <TextField
              label='Password'
              type='password'
              variant='outlined'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              variant='contained'
              color='primary'
              type='submit'
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color='inherit' />
              ) : (
                'Login'
              )}
            </Button>
          </Box>
          {error && (
            <Typography
              variant='body2'
              color='error'
              align='center'
              sx={{ mt: 2 }}
            >
              {error.error || error}
            </Typography>
          )}
        </Paper>
      </Container>
    </LayoutWrapper>
  )
}

export default AdminLogin

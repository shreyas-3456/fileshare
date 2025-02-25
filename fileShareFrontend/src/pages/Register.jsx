import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { register } from '../store/reducers/userReducer'
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

const Register = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [email, setEmail] = useState('')
  const [passwordMismatch, setPasswordMismatch] = useState(false)

  const dispatch = useDispatch()
  const { loading, error } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()

    if (password !== retypePassword) {
      setPasswordMismatch(true)
      return
    }
    setPasswordMismatch(false)

    const userData = { username, password, email }
    dispatch(register(userData)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        navigate('/login')
      }
    })
  }

  return (
    <Container maxWidth='sm'>
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant='h4' align='center' gutterBottom>
          Register
        </Typography>
        <Box
          component='form'
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label='Username'
            variant='outlined'
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            label='Email'
            variant='outlined'
            type='email'
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label='Password'
            variant='outlined'
            type='password'
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <TextField
            label='Retype Password'
            variant='outlined'
            type='password'
            fullWidth
            value={retypePassword}
            onChange={(e) => setRetypePassword(e.target.value)}
            required
          />
          {passwordMismatch && (
            <Typography variant='body2' color='error'>
              Passwords do not match.
            </Typography>
          )}
          <Button
            type='submit'
            variant='contained'
            color='primary'
            fullWidth
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? (
              <CircularProgress size={24} color='inherit' />
            ) : (
              'Register'
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
            {error.details || error}
          </Typography>
        )}
      </Paper>
    </Container>
  )
}

export default Register

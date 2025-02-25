import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { login } from '../store/reducers/userReducer'
import { Link, useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Link as MuiLink,
  CircularProgress,
} from '@mui/material'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { loading, error, reciveCode } = useSelector((state) => state.auth)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!reciveCode) {
      dispatch(login({ username, password })).then((action) => {
        if (action.meta.requestStatus === 'fulfilled') {
          // Optionally, handle MFA code flow trigger here if needed.
        }
      })
    } else {
      dispatch(login({ username, password, email_code: mfaCode })).then(
        (action) => {
          if (action.meta.requestStatus === 'fulfilled') {
            setTimeout(() => navigate('/'), 300)
          }
        }
      )
    }
  }

  return (
    <Container maxWidth='sm'>
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant='h4' align='center' gutterBottom>
          Login
        </Typography>
        <Box display='flex' justifyContent='center' mb={2}>
          <MuiLink component={Link} to='/register' underline='hover'>
            Not a user? Register here.
          </MuiLink>
        </Box>
        <form onSubmit={handleSubmit}>
          <Box display='flex' flexDirection='column' gap={2}>
            {!reciveCode ? (
              <>
                <TextField
                  label='Username'
                  variant='outlined'
                  fullWidth
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
              </>
            ) : (
              <TextField
                label='Enter MFA Code'
                variant='outlined'
                fullWidth
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
              />
            )}
            <Button
              type='submit'
              variant='contained'
              color='primary'
              fullWidth
              sx={{ py: 1.5 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color='inherit' />
              ) : (
                'Login'
              )}
            </Button>
          </Box>
        </form>
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
  )
}

export default Login

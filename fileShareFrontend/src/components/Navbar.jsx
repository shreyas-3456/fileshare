import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUserProfile, logout } from '../store/reducers/userReducer'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  Box,
} from '@mui/material'
import { styled } from '@mui/material/styles'

// Create a custom AppBar with a gradient background
const GradientAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)',
  boxShadow: 'none',
}))

// Create a styled Typography for the title
const TitleTypography = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'color 0.3s ease',
  '&:hover': {
    color: '#ffd700',
  },
}))

const Navbar = () => {
  const dispatch = useDispatch()
  const { user, email, loading } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user && !email) {
      dispatch(fetchUserProfile())
    }
  }, [dispatch, user, email])

  const handleLogout = async () => {
    const action = await dispatch(logout())
    if (action.meta.requestStatus === 'fulfilled') {
      navigate('/login')
    }
  }

  return (
    <GradientAppBar position='static'>
      <Toolbar
        sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}
      >
        <TitleTypography variant='h6' onClick={() => navigate('/')}>
          FileShare
        </TitleTypography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {loading ? (
            <CircularProgress size={24} color='inherit' />
          ) : user || email ? (
            <>
              <Typography variant='body1' sx={{ color: '#fff' }}>
                Welcome, {user || email}
              </Typography>
              <Button
                variant='contained'
                onClick={handleLogout}
                sx={{
                  backgroundColor: '#ff6f61',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#ff3b2e' },
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button
              variant='contained'
              onClick={() => navigate('/login')}
              sx={{
                backgroundColor: '#1976d2',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#115293' },
              }}
            >
              Log In
            </Button>
          )}
        </Box>
      </Toolbar>
    </GradientAppBar>
  )
}

export default Navbar

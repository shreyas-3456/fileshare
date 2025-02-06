import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUserProfile, logout } from '../store/reducers/userReducer'
import { useNavigate } from 'react-router-dom'

const Navbar = () => {
  const dispatch = useDispatch()
  const { user, email, loading } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user && !email) {
      dispatch(fetchUserProfile()).then((action) => {
        if (action.meta.requestStatus === 'fulfilled') {
          // navigate('/') // Redirect to home on success
        }
      })
    }
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout()).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        navigate('/login') // Redirect to home on success
      }
    })
  }

  return (
    <nav>
      {loading ? (
        <p>Loading...</p>
      ) : user || email ? (
        <div>
          <span>Welcome, {user}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div style={{ cursor: 'pointer' }}>
          <span onClick={() => navigate('/login')}>Please log in</span>
        </div>
      )}
    </nav>
  )
}

export default Navbar

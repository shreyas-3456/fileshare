import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { adminLogin } from '../store/reducers/userReducer' // Your admin login async thunk
import { useNavigate } from 'react-router-dom'

const AdminLogin = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector((state) => state.auth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Dispatch the admin login action; it posts to /admin/login/
    dispatch(adminLogin({ username, password })).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        // After successful login, navigate to home
        navigate('/admin')
      }
    })
  }

  return (
    <div>
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type='text'
            placeholder='Username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type='password'
            placeholder='Password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type='submit' disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error.error || error}</p>}
    </div>
  )
}

export default AdminLogin

import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { login } from '../store/reducers/userReducer' // Your login thunk
import { Link, useNavigate } from 'react-router-dom'
import LayoutWrapper from '../components/LayoutWrapper'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { loading, error, reciveCode } = useSelector((state) => state.auth)

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Dispatch login action with username, password and (if available) MFA code
    if (!reciveCode) {
      // First phase: send without MFA code.
      dispatch(login({ username, password })).then((action) => {
        if (action.meta.requestStatus === 'fulfilled') {
          action.payload.message &&
            action.payload.message.toLowerCase().includes('mfa code sent')
        }
      })
    } else {
      dispatch(login({ username, password, email_code: mfaCode })).then(
        (action) => {
          if (action.meta.requestStatus === 'fulfilled') {
            setTimeout(() => navigate('/'), 100)
          }
        }
      )
    }
  }

  return (
    <LayoutWrapper>
      <h2>Login Page</h2>
      <Link to={'/register'}>Not a user ? Register here </Link>
      <form onSubmit={handleSubmit}>
        {!reciveCode && (
          <>
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
          </>
        )}
        {reciveCode && (
          <div>
            <input
              type='text'
              placeholder='Enter MFA Code'
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
            />
          </div>
        )}
        <button type='submit' disabled={loading}>
          {loading ? 'Processing...' : 'Login'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error.error || error}</p>}
    </LayoutWrapper>
  )
}

export default Login

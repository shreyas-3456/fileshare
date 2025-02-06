import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { register } from '../store/reducers/userReducer'
import { useNavigate } from 'react-router-dom'

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
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className='form'>
        <input
          type='text'
          placeholder='Username'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type='email'
          placeholder='Email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type='password'
          placeholder='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type='password'
          placeholder='Retype Password'
          value={retypePassword}
          onChange={(e) => setRetypePassword(e.target.value)}
        />
        {passwordMismatch && (
          <p style={{ color: 'red' }}>Passwords do not match.</p>
        )}
        <button type='submit' disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error.details}</p>}
    </div>
  )
}

export default Register

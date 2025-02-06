import { Routes, Route } from 'react-router-dom'
import './App.css'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

import File from './components/File'
import PublicFileAccess from './pages/PublicLink'

import AdminPanel from './pages/AdminPanel'
import AdminLogin from './pages/AdminLogin'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/admin' element={<AdminPanel />} />
        <Route path='/admin/login' element={<AdminLogin />} />
        <Route path='/files/:file_id' element={<File />} />
        <Route path='/view/:public_token' element={<PublicFileAccess />} />
      </Routes>
    </>
  )
}

export default App

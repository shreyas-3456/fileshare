import React, { useEffect, useState } from 'react'
import api from '../store/api'

// Create an Axios instance that sends credentials (JWT cookies)

const AdminPanel = () => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get('/admin/files/')
        setFiles(response.data)
      } catch (err) {
        setError(err.response?.data?.error || 'Error fetching files.')
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [])

  if (loading) return <p>Loading files...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <h2>Admin Panel - All Files</h2>
      <table border='1' cellPadding='8' cellSpacing='0'>
        <thead>
          <tr>
            <th>ID</th>
            <th>File Name</th>
            <th>Owner</th>
            <th>Shared With</th>
            <th>Uploaded At</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td>{file.id}</td>
              <td>{file.file_name}</td>
              <td>{file.owner}</td>
              <td>{file.shared_with.join(', ') || 'None'}</td>
              <td>{new Date(file.uploaded_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default AdminPanel

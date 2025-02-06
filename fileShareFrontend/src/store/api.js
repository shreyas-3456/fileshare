import axios from 'axios'
// import store from '.store' // Import Redux store

const api = axios.create({
  baseURL: 'https://localhost:8000/api',
  withCredentials: true,
})

export default api

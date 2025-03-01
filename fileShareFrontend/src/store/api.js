import axios from 'axios'
// import store from '.store' // Import Redux store

const api = axios.create({
  baseURL: 'https://3.227.230.192/api',
  withCredentials: true,
})

export default api

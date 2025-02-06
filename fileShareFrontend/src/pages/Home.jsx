import { useEffect } from 'react'
import FileUpload from '../components/FileUpload'
import { useSelector } from 'react-redux'
import LayoutWrapper from '../components/LayoutWrapper'

const Home = () => {
  return (
    <LayoutWrapper>
      <FileUpload />
    </LayoutWrapper>
  )
}

export default Home

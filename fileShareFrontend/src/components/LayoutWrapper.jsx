import Navbar from './Navbar'

const LayoutWrapper = ({ children }) => {
  return (
    <div>
      <Navbar />
      {children}
    </div>
  )
}

export default LayoutWrapper

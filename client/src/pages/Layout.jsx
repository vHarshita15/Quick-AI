import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { X, Menu } from 'lucide-react'
import Sidebar from '../components/Sidebar'

const Layout = () => {
  const navigate = useNavigate()
  const [sidebar, setSidebar] = useState(false)

  return (
    <div className='flex flex-col items-start justify-start h-screen'>

      <nav className='w-full px-8 min-h-14 flex items-center justify-between border-b border-gray-200'>
        <img src={assets.logo} alt="" onClick={() => navigate('/')} />
        {
          sidebar
            ? <X onClick={() => setSidebar(false)} className='w-6 h-6 text-gray-600 sm:hidden' />
            : <Menu onClick={() => setSidebar(true)} className='w-6 h-6 text-gray-600 sm:hidden' />
        }
      </nav>

      <div className='flex-1 w-full flex h-[calc(100vh-56px)]'>
        <Sidebar sidebar={sidebar} setSidebar={setSidebar} />
        <div className='flex-1 bg-[#F4F7FB] overflow-y-auto'>
          <Outlet />
        </div>
      </div>

    </div>
  )
}

export default Layout
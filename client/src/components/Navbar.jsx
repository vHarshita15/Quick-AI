import React from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { openSignIn } = useClerk();

  return (
    <div className='fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-2xl flex justify-between items-center py-3 px-4'>
      <img
        src={assets.logo}
        alt="logo"
        className='w-32 sm:w-44 cursor-pointer'
        onClick={() => navigate('/')}
      />

      {user ? (
        <UserButton />
      ) : (
        <button
          onClick={openSignIn}
          className='flex items-center gap-2 rounded-full text-sm cursor-pointer bg-primary text-white px-10 py-2.5'
        >
          Get started <ArrowRight className='w-4 h-4' />
        </button>
      )}
    </div>
  );
};

export default Navbar;
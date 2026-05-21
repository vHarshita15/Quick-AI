import { useUser } from '@clerk/clerk-react'
import React, { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'

const dummyPublishedCreationData = [
  {
    content: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
    prompt: 'Generate an image of A Boy is on Boat , and fishing in the style Anime style',
    likes: ['user1', 'user2'],
  },
  {
    content: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    prompt: 'A boy riding a bicycle on a tree-lined road in anime style',
    likes: ['user1', 'user2'],
  },
  {
    content: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    prompt: 'A child flying in the sky on a quad bike, 3D render style',
    likes: ['user1'],
  },
  {
    content: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    prompt: 'Portrait of a young woman in golden hour lighting, realistic style',
    likes: [],
  },
  {
    content: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    prompt: 'Majestic mountain landscape at sunrise with mist, oil painting style',
    likes: ['user1'],
  },
  {
    content: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400',
    prompt: 'A cute golden retriever puppy in a flower field, watercolor style',
    likes: ['user1', 'user2', 'user3'],
  },
]

const Community = () => {

  const [creations, setCreations] = useState([])
  const { user } = useUser()

  useEffect(() => {
    setCreations(dummyPublishedCreationData)
  }, [])

  const toggleLike = (index) => {
    if (!user) return
    setCreations(prev => prev.map((creation, i) => {
      if (i !== index) return creation
      const liked = creation.likes.includes(user.id)
      return {
        ...creation,
        likes: liked
          ? creation.likes.filter(id => id !== user.id)
          : [...creation.likes, user.id]
      }
    }))
  }

  return (
    <div className='flex-1 h-full flex flex-col gap-4 p-6 text-slate-700'>
      <p>Creations</p>
      <div className='bg-white h-full w-full rounded-xl overflow-y-scroll p-3'>
        <div className='grid grid-cols-2 lg:grid-cols-3 gap-3'>
          {creations.map((creation, index) => (
            <div key={index} className='relative group rounded-lg overflow-hidden aspect-square'>
              <img
                src={creation.content}
                alt=""
                className='w-full h-full object-cover'
              />
              <div className='absolute bottom-0 left-0 right-0 hidden group-hover:flex flex-col gap-1 bg-black/50 p-2 rounded-b-lg'>
                <p className='text-xs text-white leading-tight'>{creation.prompt}</p>
                <div className='flex items-center gap-1'>
                  <p className='text-white text-xs'>{creation.likes.length}</p>
                  <Heart
                    onClick={() => toggleLike(index)}
                    className={`w-4 h-4 hover:scale-110 cursor-pointer ${
                      user && creation.likes.includes(user.id)
                        ? 'fill-red-500 text-red-600'
                        : 'text-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Community
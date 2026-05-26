import { Scissors, Sparkles } from 'lucide-react';
import React, { useState } from 'react'
import axios from '../api/axiosClient'
import toast from 'react-hot-toast'

const RemoveObjects = () => {

  const [imageFile, setImageFile] = useState(null)
  const [objectName, setObjectName] = useState('')
  const [processedImage, setProcessedImage] = useState(null)
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (!imageFile || !objectName.trim()) {
      if (!imageFile) toast.error('Please upload an image.')
      if (!objectName.trim()) toast.error('Please specify the object to remove.')
      return
    }

    setLoading(true)
    setProcessedImage(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('object', objectName.trim())

      const { data } = await axios.post('/api/ai/remove-image-object', formData)

      if (data.success && data.content) {
        setProcessedImage(data.content)
      } else {
        toast.error(data.message || 'Object removal failed. Please try again.')
      }
    } catch (err) {
      console.error('[frontend] RemoveObjects error', err.response || err)
      toast.error(err.response?.data?.message || err.message || 'Object removal failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

      {/* Left col */}
      <form onSubmit={onSubmitHandler} className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>

        <div className='flex items-center gap-3'>
          <Sparkles className='w-6 text-[#4A7AFF]' />
          <h1 className='text-xl font-semibold'>Object Removal</h1>
        </div>

        <p className='mt-6 text-sm font-medium'>Upload image</p>
        <input
          onChange={(e) => setImageFile(e.target.files[0])}
          type="file"
          accept="image/*"
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          required
        />
        <p className='text-xs text-gray-400 mt-1'>Supports JPG, PNG, and other image formats</p>

        <p className='mt-4 text-sm font-medium'>Describe object name to remove</p>
        <textarea
          onChange={(e) => setObjectName(e.target.value)}
          value={objectName}
          rows={4}
          placeholder='e.g., watch or spoon , Only single object name'
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          required
        />

        <button
          type='submit'
          disabled={loading}
          className='w-full flex justify-center items-center gap-2 bg-linear-to-r from-[#F6AB41] to-[#EE4938] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
        >
          <Scissors className='w-5' />
          {loading ? 'Processing...' : 'Remove object'}
        </button>

      </form>

      {/* Right col */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96'>

        <div className='flex items-center gap-3'>
          <Scissors className='w-5 h-5 text-[#4A7AFF]' />
          <h1 className='text-xl font-semibold'>Processed Image</h1>
        </div>

        <div className='flex-1 flex justify-center items-center'>
          {processedImage ? (
            <div className='w-full mt-4 flex flex-col gap-3'>
              <img
                src={processedImage}
                alt='Processed result'
                className='w-full rounded-lg border border-gray-200 object-contain max-h-130'
              />
              <a
                href={processedImage}
                target='_blank'
                rel='noreferrer'
                className='text-xs text-blue-600 underline'
              >
                Open result in new tab
              </a>
            </div>
          ) : (
            <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
              <Scissors className='w-9 h-9' />
              <p>Upload an image and click "Remove Object" to get started</p>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

export default RemoveObjects

import { Eraser, Sparkles } from 'lucide-react'
import { useState } from 'react'
import axios from '../api/axiosClient'
import toast from 'react-hot-toast'

const RemoveBackground = () => {

  const [input, setInput] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (!input || loading) {
      if (!input) toast.error('Please upload an image before submitting.')
      return
    }

    setLoading(true)
    setProcessedImage(null)

    try {
      const formData = new FormData()
      formData.append('image', input)

      console.log('[frontend] RemoveBackground request', {
        fileName: input.name,
        fileType: input.type,
        fileSize: input.size,
      })

      const { data } = await axios.post(
        '/api/ai/remove-image-background',
        formData
      )

      console.log('[frontend] RemoveBackground response', data)

      if (data.success && data.content) {
        setProcessedImage(data.content)
      } else {
        toast.error(data.message || 'Background removal failed')
      }
    } catch (err) {
      console.error('[frontend] RemoveBackground error', err.response || err)
      toast.error(err.response?.data?.message || err.message || 'Background removal failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

      {/* Left col */}
      <form onSubmit={onSubmitHandler} className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>

        <div className='flex items-center gap-3'>
          <Sparkles className='w-6 text-[#FF4938]' />
          <h1 className='text-xl font-semibold'>Background Removal</h1>
        </div>

        <p className='mt-6 text-sm font-medium'>Upload image</p>
        <input
          onChange={(e) => setInput(e.target.files[0])}
          type="file"
          accept="image/*"
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          required
        />
        <p className='text-xs text-gray-400 mt-1'>Supports JPG, PNG, and other image formats</p>

        <button
          type='submit'
          disabled={loading}
          className='w-full flex justify-center items-center gap-2 bg-linear-to-r from-[#FF4938] to-[#FFAD33] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
        >
          {loading ? (
            <span className='w-4 h-4 my-1 rounded-full border-2 border-white border-t-transparent animate-spin' />
          ) : (
            <Eraser className='w-5' />
          )}
          {loading ? 'Processing...' : 'Remove background'}
        </button>

      </form>

      {/* Right col */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96'>

        <div className='flex items-center gap-3'>
          <Eraser className='w-5 h-5 text-[#FF4938]' />
          <h1 className='text-xl font-semibold'>Processed Image</h1>
        </div>

        <div className='flex-1 flex flex-col justify-center items-center'>
          {processedImage ? (
            <div className='w-full mt-4 space-y-3'>
              <img
                src={processedImage}
                alt='Background removed'
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
              <Eraser className='w-9 h-9' />
              <p>Upload an image and click "Remove Background" to get started</p>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

export default RemoveBackground

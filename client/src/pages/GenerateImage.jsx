import { useState } from 'react'
import { Sparkles, Image } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000'

const GenerateImages = () => {

  const imageStyle = ['Realistic', 'Ghibli style', 'Anime style', 'Cartoon style',
    'Fantasy style', 'Realistic style', '3D style', 'Portrait style']

  const [selectedStyle, setSelectedStyle] = useState('Realistic')
  const [input, setInput] = useState('')
  const [publish, setPublish] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (loading) return
    if (!input.trim()) {
      toast.error('Please describe the image you want to generate.')
      return
    }

    setLoading(true)
    setGeneratedImage(null)

    try {
      const prompt = `${input.trim()}, ${selectedStyle} style`
      const { data } = await axios.post(
        '/api/ai/generate-image',
        { prompt, publish }
      )

      if (data.success) {
        setGeneratedImage(data.content)
      } else {
        toast.error(data.message || 'Image generation failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Image generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

      {/* Left col */}
      <form onSubmit={onSubmitHandler} className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>

        <div className='flex items-center gap-3'>
          <Sparkles className='w-6 text-[#00AD25]'/>
          <h1 className='text-xl font-semibold'>AI Image Generator</h1>
        </div>

        <p className='mt-6 text-sm font-medium'>Describe Your Image</p>
        <textarea
          onChange={(e) => setInput(e.target.value)}
          value={input}
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 resize-y min-h-24'
          placeholder='Describe what you want to see in the image..'
          required
        />

        <p className='mt-4 text-sm font-medium'>Style</p>
        <div className='mt-3 flex gap-3 flex-wrap sm:max-w-9/11'>
          {imageStyle.map((item) => (
            <span
              onClick={() => setSelectedStyle(item)}
              className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${
                selectedStyle === item
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'text-gray-500 border-gray-300'
              }`}
              key={item}
            >
              {item}
            </span>
          ))}
        </div>

        <div className='my-6 flex items-center gap-2'>
          <label className='relative cursor-pointer'>
            <input
              type="checkbox"
              onChange={(e) => setPublish(e.target.checked)}
              checked={publish}
              className='sr-only peer'
            />
            <div className='w-10 h-5 bg-gray-300 rounded-full peer peer-checked:bg-green-500 transition-colors'></div>
            <div className='absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform'></div>
          </label>
          <span className='text-sm'>Make this image Public</span>
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full flex justify-center items-center gap-2 bg-linear-to-r from-[#00AD25] to-[#04FF50] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
        >
          {loading ? (
            <span className='w-4 h-4 my-1 rounded-full border-2 border-white border-t-transparent animate-spin' />
          ) : (
            <Image className='w-5'/>
          )}
          {loading ? 'Generating...' : 'Generate Image'}
        </button>

      </form>

      {/* Right col */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96'>

        <div className='flex items-center gap-3'>
          <Image className='w-5 h-5 text-[#00AD25]' />
          <h1 className='text-xl font-semibold'>Generated image</h1>
        </div>

        <div className='flex-1 flex justify-center items-center'>
          {generatedImage ? (
            <img
              src={generatedImage}
              alt="Generated"
              className='w-full mt-4 rounded-lg border border-gray-200 object-contain max-h-130'
            />
          ) : (
            <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
              <Image className='w-9 h-9' />
              <p>Enter a topic and click "Generate image" to get started</p>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

export default GenerateImages

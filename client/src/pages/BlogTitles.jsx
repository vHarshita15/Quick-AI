import React, { useState } from 'react'
import { Sparkles, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000'

const blogLength = [
  { text: 'Short' },
  { text: 'Medium' },
  { text: 'Long' },
]

const BlogTitles = () => {
  const blogCategories = ['General', 'Technology', 'Business', 'Health',
    'Lifestyle', 'Education', 'Travel', 'Food']
  const [selectedCategory, setSelectedCategory] = useState(blogCategories[0])
  const [selectedLength, setSelectedLength] = useState(blogLength[0])
  const [input, setInput] = useState('')
  const [titles, setTitles] = useState([])
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (loading) return
    if (!input.trim()) {
      toast.error('Please enter a topic before generating titles.')
      return
    }

    setLoading(true)
    setTitles([])

    try {
      const prompt = `Generate exactly 5 catchy blog titles for the topic "${input}". Category: ${selectedCategory}. Length preference: ${selectedLength.text}. Return only a JSON array of strings, with no explanation, no markdown, no numbering. Example: ["Title 1","Title 2","Title 3","Title 4","Title 5"]`

      console.log('[frontend] BlogTitles request', {
        topic: input,
        category: selectedCategory,
        length: selectedLength.text,
      })

      const { data } = await axios.post(
        '/api/ai/generate-blog-title',
        {
          prompt,
          length: 300,
        }
      )

      const text = String(data.content || '').trim()
      const jsonText = text.replace(/```json|```/g, '').trim()

      let parsed = []
      try {
        parsed = JSON.parse(jsonText)
      } catch (parseErr) {
        const arrayMatch = jsonText.match(/\[.*\]/s)
        if (arrayMatch) {
          try {
            parsed = JSON.parse(arrayMatch[0])
          } catch {
            parsed = []
          }
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        const fallbackTitles = jsonText
          .split(/\r?\n/)
          .map((line) => line.replace(/^\s*\d+\.\s*/, '').trim())
          .filter((line) => line.length > 0)

        if (fallbackTitles.length > 0) {
          parsed = fallbackTitles
        }
      }

      console.log('[frontend] BlogTitles response', { parsed, raw: text })
      if (Array.isArray(parsed) && parsed.length > 0) {
        setTitles(parsed)
      } else {
        toast.error('Unable to parse title output from AI. Please try again.')
      }
    } catch (err) {
      console.error('[frontend] BlogTitles error', err)
      toast.error(err.message || 'Unable to generate titles. Please try later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

      {/* Left col */}
      <form onSubmit={onSubmitHandler} className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>

        <div className='flex items-center gap-3'>
          <Sparkles className='w-6 text-[#4A7AFF]'/>
          <h1 className='text-xl font-semibold'>AI Title</h1>
        </div>

        <p className='mt-6 text-sm font-medium'>Article Topic</p>
        <input
          onChange={(e) => setInput(e.target.value)}
          value={input}
          type="text"
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          placeholder='The future of artificial intelligence is...'
          required
        />

        <p className='mt-4 text-sm font-medium'>Category</p>
        <div className='mt-3 flex gap-3 flex-wrap'>
          {blogCategories.map((cat, index) => (
            <span
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'text-gray-500 border-gray-300'
              }`}
              key={index}
            >
              {cat}
            </span>
          ))}
        </div>

        <p className='mt-4 text-sm font-medium'>Article Length</p>
        <div className='mt-3 flex gap-3 flex-wrap'>
          {blogLength.map((item, index) => (
            <span
              onClick={() => setSelectedLength(item)}
              className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${
                selectedLength.text === item.text
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'text-gray-500 border-gray-300'
              }`}
              key={index}
            >
              {item.text}
            </span>
          ))}
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full flex justify-center items-center gap-2 bg-[#C341F6] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
        >
          <Hash className='w-5'/>
          {loading ? 'Generating...' : 'Generate title'}
        </button>
      </form>

      {/* Right col */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96 max-h-150'>

        <div className='flex items-center gap-3'>
          <Hash className='w-5 h-5 text-[#8E37EB]' />
          <h1 className='text-xl font-semibold'>Generated titles</h1>
        </div>

        <div className='flex-1 flex justify-center items-center'>
          {titles.length === 0 ? (
            <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
              <Hash className='w-9 h-9' />
              <p>Enter a topic and click "Generate title" to get started</p>
            </div>
          ) : (
            <ul className='w-full mt-4 flex flex-col gap-3'>
              {titles.map((title, i) => (
                <li key={i} className='p-3 border border-gray-200 rounded-lg text-sm text-slate-700'>
                  {title}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

    </div>
  )
}

export default BlogTitles
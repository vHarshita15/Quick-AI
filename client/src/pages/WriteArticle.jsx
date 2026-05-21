import { useState } from 'react'
import { Edit, Sparkles } from 'lucide-react'
import Markdown from 'react-markdown'
import axios from 'axios'
import toast from 'react-hot-toast'

axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL || 'http://localhost:3000'

const markdownComponents = {
  h1: ({ children }) => <h1 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem', marginTop: '1rem', color: '#1e293b' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.4rem', marginTop: '0.9rem', color: '#1e293b' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.3rem', marginTop: '0.8rem', color: '#334155' }}>{children}</h3>,
  p:  ({ children }) => <p  style={{ marginBottom: '0.6rem', lineHeight: '1.7', color: '#475569' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.6rem', listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.6rem', listStyleType: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: '0.25rem', color: '#475569', lineHeight: '1.6' }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: '600', color: '#1e293b' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  hr: () => <hr style={{ margin: '0.8rem 0', borderColor: '#e2e8f0' }} />,
}

const WriteArticle = () => {
  const articleLength = [
    { minWords: 500, maxWords: 800, maxTokens: 1200, text: 'Short (500-800 words)' },
    { minWords: 800, maxWords: 1200, maxTokens: 1800, text: 'Medium (800-1200 words)' },
    { minWords: 1200, maxTokens: 2600, text: 'Long (1200+ words)' },
  ]

  const [selectedLength, setSelectedLength] = useState(articleLength[0])
  const [input, setInput] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setContent('')

    try {
      const wordLimit =
        selectedLength.maxWords
          ? `${selectedLength.minWords}-${selectedLength.maxWords} words`
          : `at least ${selectedLength.minWords} words`
      const prompt = `Write a complete, well-structured article about "${input.trim()}". The article must be ${wordLimit}. Use markdown headings, keep the content focused on the topic, and do not end early.`
      const { data } = await axios.post(
        '/api/ai/generate-article',
        {
          prompt,
          length: selectedLength.maxTokens,
          max_tokens: selectedLength.maxTokens,
          minWords: selectedLength.minWords,
          maxWords: selectedLength.maxWords,
        }
      )
      if (data.success) {
        setContent(data.article || data.content || data.message)
      } else {
        toast.error(data.message || 'Article generation failed')
      }
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error(error.response?.data?.message || 'Rate limit reached. Please wait before retrying.')
      } else {
        toast.error(error.response?.data?.message || error.message || 'Article generation failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

      {/* Left Section */}
      <form
        onSubmit={onSubmitHandler}
        className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'
      >
        <div className='flex items-center gap-3'>
          <Sparkles className='w-6 text-[#4A7AFF]' />
          <h1 className='text-xl font-semibold'>Article Configuration</h1>
        </div>

        <p className='mt-6 text-sm font-medium'>Article Topic</p>
        <input
          type='text'
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300'
          placeholder='The future of artificial intelligence is...'
          required
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <p className='mt-4 text-sm font-medium'>Article Length</p>
        <div className='mt-3 flex gap-3 flex-wrap'>
          {articleLength.map((item, index) => (
            <span
              key={index}
              onClick={() => setSelectedLength(item)}
              className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${
                selectedLength.text === item.text
                  ? 'bg-blue-50 text-blue-700 border-blue-700'
                  : 'text-gray-500 border-gray-300'
              }`}
            >
              {item.text}
            </span>
          ))}
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full flex justify-center items-center gap-2 bg-linear-to-r from-[#226BFF] to-[#65ADFF] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
        >
          {loading ? (
            <span className='w-4 h-4 my-1 rounded-full border-2 border-white border-t-transparent animate-spin' />
          ) : (
            <Edit className='w-5' />
          )}
          {loading ? 'Generating...' : 'Generate article'}
        </button>
      </form>

      {/* Right Section */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96 max-h-150 overflow-hidden'>

        <div className='flex items-center gap-3 shrink-0'>
          <Edit className='w-5 h-5 text-[#4A7AFF]' />
          <h1 className='text-xl font-semibold'>Generated article</h1>
        </div>

        {!content ? (
          <div className='flex-1 flex justify-center items-center'>
            <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
              <Edit className='w-9 h-9' />
              <p>Enter a topic and click "Generate article" to get started</p>
            </div>
          </div>
        ) : (
          <div className='mt-3 flex-1 overflow-y-auto'>
            <Markdown components={markdownComponents}>{content}</Markdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default WriteArticle

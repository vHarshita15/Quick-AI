import { FileText, Sparkles } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import Markdown from 'react-markdown'
import axios from '../api/axiosClient'

const ReviewResume = () => {
  const [input, setInput] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (!input || loading) return
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('resume', input)
      const { data } = await axios.post(
        '/api/ai/resume-review',
        formData
      )

      if (data.success) {
        setResult(data.content)
      } else {
        toast.error(data.message || 'Resume review failed')
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Resume review failed. Please try again.'
      const status = err.response?.status
      toast.error(status ? `${status}: ${message}` : message)
      console.error('[frontend] ReviewResume error', status, err.response?.data || err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700'>

      {/* Left col */}
      <form onSubmit={onSubmitHandler} className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>

        <div className='flex items-center gap-3'>
          <Sparkles className='w-6 text-[#00DA83]' />
          <h1 className='text-xl font-semibold'>Resume Review</h1>
        </div>

        <p className='mt-6 text-sm font-medium'>Upload Resume</p>
        <input
          onChange={(e) => setInput(e.target.files[0])}
          type="file"
          accept="application/pdf"
          className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300 text-gray-600'
          required
        />
        <p className='text-xs text-gray-500 font-light mt-1'>Supports PDF resume only.</p>

        <button
          type='submit'
          disabled={loading}
          className='w-full flex justify-center items-center gap-2 bg-[#FF4938] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
        >
          {loading ? (
            <span className='w-4 h-4 my-1 rounded-full border-2 border-white border-t-transparent animate-spin' />
          ) : (
            <FileText className='w-5' />
          )}
          {loading ? 'Analyzing...' : 'Review Resume'}
        </button>

      </form>

      {/* Right col */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96 max-h-[calc(100vh-8rem)]'>

        <div className='flex items-center gap-3'>
          <FileText className='w-5 h-5 text-[#00DA83]' />
          <h1 className='text-xl font-semibold'>Analysis Results</h1>
        </div>

        <div className='flex-1 flex flex-col justify-center items-center overflow-hidden'>
          {loading && (
            <div className='text-sm flex flex-col items-center gap-3 text-gray-400'>
              <div className='w-8 h-8 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin' />
              <p>Analyzing your resume...</p>
            </div>
          )}

          {!loading && result && (
            <div className='w-full h-full mt-4 overflow-y-auto text-sm text-gray-700'>
              <div className='prose prose-sm max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-p:text-slate-600 prose-strong:text-slate-700 prose-li:text-slate-600'>
                <Markdown>{result}</Markdown>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
              <FileText className='w-9 h-9' />
              <p>Upload a resume and click "Review Resume" to get started</p>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

export default ReviewResume

import { useState, useEffect, useCallback, useRef } from 'react'
import { getStorage, getVideoId, sendChat, loadHistory, saveHistory, type ChatMessage } from './api'

const SUGGESTED_QUESTIONS = [
  'Summarize this video',
  'What are the most important points?',
  'Give me practical takeaways from this video',
] as const

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(window.location.href)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>('')
  const [backendUrl, setBackendUrl] = useState<string>('http://127.0.0.1:8000')
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const videoId = getVideoId(url)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    getStorage().then(({ apiKey: key, backendUrl: url }) => {
      setApiKey(key)
      setBackendUrl(url)
    })
  }, [])

  useEffect(() => {
    let prev = window.location.href
    const id = window.setInterval(() => {
      const href = window.location.href
      if (href !== prev) {
        prev = href
        setUrl(href)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // Listen to YouTube's SPA navigation events so we react immediately
  // when user clicks another video without a full page reload.
  useEffect(() => {
    const handleNavigate = () => {
      setUrl(window.location.href)
    }
    // YouTube fires this custom event on navigation
    window.addEventListener('yt-navigate-finish' as any, handleNavigate as any)
    return () => {
      window.removeEventListener('yt-navigate-finish' as any, handleNavigate as any)
    }
  }, [])

  useEffect(() => {
    if (!videoId || videoId === currentVideoId) return
    setCurrentVideoId(videoId)
    setError(null)
    loadHistory(videoId).then((saved) => {
      setMessages(saved || [])
    })
    // Open chat by default whenever we detect a (new) video.
    setOpen(true)
  }, [videoId, currentVideoId])

  useEffect(() => {
    if (!videoId) return
    void saveHistory(videoId, messages)
  }, [messages, videoId])

  const handleSend = async (overrideQuestion?: string) => {
    const qRaw = overrideQuestion ?? input
    const q = qRaw.trim()
    if (!q || loading) return

    if (!apiKey) {
      setError('Add your OpenAI API key in extension options first.')
      return
    }

    if (!videoId) {
      setError('Could not detect video. Refresh the page.')
      return
    }

    setLastQuestion(q)
    if (!overrideQuestion) {
      setInput('')
    }
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    const result = await sendChat(backendUrl, apiKey, videoId, q)
    setLoading(false)

    if ('error' in result) {
      setError(result.error || 'Something went wrong. Please try again.')
      return
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: result.answer }])
  }

  const handleRetry = async () => {
    if (!lastQuestion || loading) return
    if (!apiKey) {
      setError('Add your OpenAI API key in extension options first.')
      return
    }
    if (!videoId) {
      setError('Could not detect video. Refresh the page.')
      return
    }

    setError(null)
    setLoading(true)
    const result = await sendChat(backendUrl, apiKey, videoId, lastQuestion)
    setLoading(false)

    if ('error' in result) {
      setError(result.error || 'Something went wrong. Please try again.')
      return
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: result.answer }])
  }

  const openOptions = () => {
    window.open(chrome.runtime.getURL('options.html'), '_blank')
  }


  if (!videoId) {
    return null
  }

  return (
    <>
      <button
        className="yt-chat-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Chat with this video"
      >
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="yt-chat-panel">
          <div className="yt-chat-header">Chat with this video</div>
          <div className="yt-chat-messages">
            {messages.length === 0 && !loading && !error && (
              <div className="yt-chat-empty">
                Ask anything about this video.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`yt-chat-msg yt-chat-msg--${m.role}`}>
                <span className="yt-chat-msg-label">{m.role === 'user' ? 'You' : 'AI'}</span>
                <div className="yt-chat-msg-content">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="yt-chat-msg yt-chat-msg--assistant">
                <span className="yt-chat-msg-label">AI</span>
                <div className="yt-chat-msg-content yt-chat-loading">Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {error && (
            <div className="yt-chat-error">
              <span>{error}</span>
              {lastQuestion && (
                <button type="button" className="yt-chat-retry" onClick={handleRetry} disabled={loading}>
                  Try again
                </button>
              )}
              {!apiKey && (
                <button type="button" className="yt-chat-link" onClick={openOptions}>
                  Open options
                </button>
              )}
            </div>
          )}
          {messages.length === 0 && !loading && !error && (
            <div className="yt-chat-suggestions-bar">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="yt-chat-suggestion-link"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="yt-chat-input-wrap">
            <input
              type="text"
              className="yt-chat-input"
              placeholder="Ask about this video..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <button
              type="button"
              className="yt-chat-send"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}

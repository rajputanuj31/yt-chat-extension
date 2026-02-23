import { useState, useEffect } from 'react'
import './Options.css'

const STORAGE_KEY = 'openai_api_key'
const BACKEND_URL_KEY = 'backend_url'

const isExtension = typeof chrome !== 'undefined' && chrome.storage?.local

export default function Options() {
  const [apiKey, setApiKey] = useState('')
  const [backendUrl, setBackendUrl] = useState('http://127.0.0.1:8000')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (isExtension) {
      chrome.storage.local.get([STORAGE_KEY, BACKEND_URL_KEY], (result: Record<string, string>) => {
        if (result[STORAGE_KEY]) setApiKey(result[STORAGE_KEY])
        if (result[BACKEND_URL_KEY]) setBackendUrl(result[BACKEND_URL_KEY])
      })
    } else {
      setApiKey(localStorage.getItem(STORAGE_KEY) || '')
      setBackendUrl(localStorage.getItem(BACKEND_URL_KEY) || 'http://127.0.0.1:8000')
    }
  }, [])

  const handleSave = () => {
    setStatus('saving')
    const url = backendUrl.replace(/\/$/, '')
    if (isExtension) {
      chrome.storage.local.set({ [STORAGE_KEY]: apiKey, [BACKEND_URL_KEY]: url }, () => {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      })
    } else {
      localStorage.setItem(STORAGE_KEY, apiKey)
      localStorage.setItem(BACKEND_URL_KEY, url)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <div className="options">
      <h1>YouTube Chat Extension</h1>
      <p className="subtitle">Configure your API key to chat with videos.</p>
      {!isExtension && (
        <p className="options-dev-note">Dev mode: using localStorage. Load the extension from dist/ for real storage.</p>
      )}

      <label>
        OpenAI API Key
        <input
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </label>

      <label>
        Backend URL
        <input
          type="url"
          placeholder="http://127.0.0.1:8000"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
        />
      </label>

      <button onClick={handleSave} disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save'}
      </button>

      {status === 'error' && <p className="error">Failed to save.</p>}
    </div>
  )
}

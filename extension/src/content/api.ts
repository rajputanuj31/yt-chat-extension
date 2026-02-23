const STORAGE_KEYS = {
  apiKey: 'openai_api_key',
  backendUrl: 'backend_url',
} as const

const HISTORY_PREFIX = 'yt_chat_history_'

export type StorageData = {
  apiKey: string
  backendUrl: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export function getStorage(): Promise<StorageData> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.apiKey, STORAGE_KEYS.backendUrl], (result) => {
      resolve({
        apiKey: result[STORAGE_KEYS.apiKey] || '',
        backendUrl: (result[STORAGE_KEYS.backendUrl] || 'http://127.0.0.1:8000').replace(/\/$/, ''),
      })
    })
  })
}

export function getVideoId(href?: string): string | null {
  try {
    const url = new URL(href ?? window.location.href)
    return url.searchParams.get('v')
  } catch {
    const params = new URLSearchParams(window.location.search)
    return params.get('v')
  }
}

export async function sendChat(
  backendUrl: string,
  apiKey: string,
  videoId: string,
  question: string
): Promise<{ answer: string } | { error: string }> {
  const res = await fetch(`${backendUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId, question, api_key: apiKey }),
  })
  const data = await res.json()
  if (!res.ok) {
    return { error: (data as { detail?: string }).detail || (data as { error?: string })?.error || 'Request failed' }
  }
  return { answer: (data as { answer?: string }).answer ?? '' }
}

export function loadHistory(videoId: string): Promise<ChatMessage[]> {
  return new Promise((resolve) => {
    const key = HISTORY_PREFIX + videoId
    chrome.storage.local.get([key], (result) => {
      const raw = result[key]
      if (!raw) {
        resolve([])
        return
      }
      try {
        resolve(raw as ChatMessage[])
      } catch {
        resolve([])
      }
    })
  })
}

export function saveHistory(videoId: string, messages: ChatMessage[]): Promise<void> {
  return new Promise((resolve) => {
    const key = HISTORY_PREFIX + videoId
    chrome.storage.local.set({ [key]: messages }, () => resolve())
  })
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ChatPanel from './ChatPanel'
import './content.css'

const container = document.createElement('div')
container.id = 'yt-chat-extension-root'
document.body.appendChild(container)

createRoot(container).render(
  <StrictMode>
    <ChatPanel />
  </StrictMode>,
)

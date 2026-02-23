# YouTube Video Chat Extension

Chrome extension to chat with YouTube videos using AI. Built with React + Vite.

## Setup

```bash
cd extension
npm install
npm run build
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/dist` folder

## Configure

1. Right-click the extension icon → **Options** (or go to `chrome://extensions` → Details → Extension options)
2. Enter your **OpenAI API key**
3. Set **Backend URL** (default: `http://127.0.0.1:8000` for local backend)
4. Click **Save**

## Use

1. Open a YouTube video (`youtube.com/watch?v=...`)
2. Click the floating **💬** button (bottom-right)
3. Chat panel opens (full chat UI in Task 4)

## Structure

- `options.html` + `src/options/` – Options page (API key, backend URL)
- `src/content/` – Content script (chat panel injected on YouTube)
- `public/manifest.json` – Extension manifest (Manifest V3)

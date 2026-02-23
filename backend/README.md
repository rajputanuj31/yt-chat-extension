# YouTube Chat Backend

API for the YouTube video chat extension: fetches transcripts and runs RAG (retrieve + LLM) using the user's OpenAI API key.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # optional
```

## Run

```bash
uvicorn app:app --reload
```

API base: `http://127.0.0.1:8000`

## Endpoints

- `GET /transcript?video_id=xxx` – fetch transcript for a video
- `POST /chat` – body: `{ "video_id": "...", "question": "...", "api_key": "sk-..." }` – RAG answer (uses API key only for that request, not stored)
- `GET /health` – health check (no rate limit)

## Security (Task 1.5)

- **CORS**: Set `CORS_ORIGINS` in `.env` to a comma-separated list of allowed origins (e.g. your extension or frontend URL). If unset or `*`, all origins are allowed. For production, set e.g. `CORS_ORIGINS=https://yourdomain.com,chrome-extension://YOUR_EXTENSION_ID`.
- **Rate limiting**: By IP. `GET /transcript` is limited to 30 requests/minute; `POST /chat` to 20/minute. Exceeding returns 429. `/health` is exempt.

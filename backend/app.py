"""
Backend API for YouTube video chat extension.
- GET /transcript?video_id=xxx
- POST /chat { "video_id", "question", "api_key" }
"""
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from youtube_transcript_api import TranscriptsDisabled

from transcript import get_transcript
from rag import answer_question

# CORS: set CORS_ORIGINS in .env (comma-separated) to restrict origins; default allows all
_origins = os.getenv("CORS_ORIGINS", "*").strip()
cors_origins = [o.strip() for o in _origins.split(",") if o.strip()] if _origins != "*" else ["*"]

app = FastAPI(title="YouTube Chat API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting by IP
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# ---- Transcript (1.2) ----


@app.get("/transcript")
@limiter.limit("30/minute")
def transcript(request: Request, video_id: str):
    """Fetch transcript for a YouTube video. Query param: video_id."""
    if not video_id or not video_id.strip():
        raise HTTPException(status_code=400, detail="video_id is required")
    try:
        text = get_transcript(video_id.strip())
        return {"transcript": text, "video_id": video_id.strip()}
    except TranscriptsDisabled:
        raise HTTPException(status_code=404, detail="No transcript available for this video")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# ---- Chat (1.4) ----


class ChatRequest(BaseModel):
    video_id: str = Field(..., min_length=1, max_length=20)
    question: str = Field(..., min_length=1, max_length=2000)
    api_key: str = Field(..., min_length=1)


@app.post("/chat")
@limiter.limit("20/minute")
def chat(request: Request, body: ChatRequest):
    """
    Answer a question about a video using RAG. Uses api_key only for this request; not stored.
    """
    try:
        transcript_text = get_transcript(body.video_id)
    except TranscriptsDisabled:
        raise HTTPException(status_code=404, detail="No transcript available for this video")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        answer = answer_question(transcript_text, body.question, body.api_key)
        return {"answer": answer}
    except Exception as e:
        msg = str(e)
        if "api_key" in msg.lower() or "invalid" in msg.lower() or "authentication" in msg.lower():
            raise HTTPException(status_code=401, detail="Invalid or missing OpenAI API key")
        raise HTTPException(status_code=500, detail=msg)


@app.get("/health")
@limiter.exempt
def health(request: Request):
    return {"status": "ok"}

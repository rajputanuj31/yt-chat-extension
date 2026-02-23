"""
Fetch YouTube video transcripts. Uses same API as youtube.py.
"""
from typing import List, Optional

from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled

# Prefer en, then en-GB/en-US so videos with only regional English still work
DEFAULT_LANGUAGES = ["en", "en-GB", "en-US"]


def get_transcript(video_id: str, languages: Optional[List[str]] = None) -> str:
    """
    Fetch transcript for a YouTube video.
    Returns plain text. Raises TranscriptsDisabled or ValueError on failure.
    """
    if not video_id or not video_id.strip():
        raise ValueError("video_id is required")
    video_id = video_id.strip()
    if languages is None:
        languages = DEFAULT_LANGUAGES

    api = YouTubeTranscriptApi()
    try:
        # First, try preferred languages (English variants)
        transcript_list = api.fetch(video_id, languages=languages)
        return " ".join(chunk.text for chunk in transcript_list)
    except TranscriptsDisabled:
        # Let caller distinguish "no transcript at all" from other failures
        print(f"[TRANSCRIPT] TranscriptsDisabled video_id={video_id}", flush=True)
        raise
    except Exception as e:
        msg = str(e)
        # DEBUG: log full library error from Render / other hosts
        print(
            f"[TRANSCRIPT ERROR] video_id={video_id} languages={languages} raw_error={msg}",
            flush=True,
        )

        # If there are transcripts but not in our preferred languages,
        # fall back to whatever language is available (e.g. Hindi).
        if "No transcripts were found for any of the requested language codes" in msg:
            try:
                fallback_list = api.fetch(video_id)
                return " ".join(chunk.text for chunk in fallback_list)
            except Exception as e2:
                print(
                    f"[TRANSCRIPT FALLBACK ERROR] video_id={video_id} raw_error={e2}",
                    flush=True,
                )
                friendly = (
                    "Unable to fetch the transcript for this video, even in its original language. "
                    "The video may not have usable captions or they might be blocked."
                )
                raise ValueError(friendly) from e2

        friendly = (
            "Unable to fetch the transcript for this video. "
            "The video may not have captions or they might be blocked."
        )
        raise ValueError(friendly) from e

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
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.fetch(video_id, languages=languages)
        return " ".join(chunk.text for chunk in transcript_list)
    except TranscriptsDisabled:
        # Let caller distinguish "no transcript at all" from other failures
        raise
    except Exception as e:
        msg = str(e)
        # youtube_transcript_api uses this message when only other languages exist
        if "No transcripts were found for any of the requested language codes" in msg:
            friendly = (
                "No transcript is available in English for this video. "
                "Try another video with English or English auto-generated captions."
            )
        else:
            friendly = (
                "Unable to fetch the transcript for this video. "
                "The video may not have captions or they might be blocked."
            )
        raise ValueError(friendly) from e

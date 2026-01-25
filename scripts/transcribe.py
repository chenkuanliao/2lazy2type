#!/usr/bin/env python3
"""Local Whisper transcription script."""
import sys
import json
import whisper

def transcribe(audio_path, model_size="base"):
    """Transcribe audio file using local Whisper model."""
    model = whisper.load_model(model_size)
    result = model.transcribe(audio_path)
    return result["text"].strip()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file provided"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    
    try:
        text = transcribe(audio_path, model_size)
        print(json.dumps({"text": text}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

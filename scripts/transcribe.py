#!/usr/bin/env python3
import sys
import json
import math
import re

import whisper

MIN_AUDIO_SECONDS = 0.35
MIN_PEAK_LEVEL = 0.01
MIN_RMS_LEVEL = 0.0008


def audio_stats(audio_path):
    audio = whisper.audio.load_audio(audio_path)
    if audio.size == 0:
        return {"duration": 0.0, "peak": 0.0, "rms": 0.0}

    peak = float(abs(audio).max())
    rms = float(math.sqrt(float((audio * audio).mean())))
    return {
        "duration": float(audio.size / whisper.audio.SAMPLE_RATE),
        "peak": peak,
        "rms": rms,
    }


def looks_like_repetition(text):
    words = re.findall(r"[^\W_]+(?:'[^\W_]+)?", text.lower(), flags=re.UNICODE)
    if len(words) < 12:
        return False

    for phrase_len in (1, 2, 3):
        phrases = [
            tuple(words[i:i + phrase_len])
            for i in range(0, len(words) - phrase_len + 1, phrase_len)
        ]
        if not phrases:
            continue
        phrase, count = max(
            ((phrase, phrases.count(phrase)) for phrase in set(phrases)),
            key=lambda item: item[1],
        )
        if count >= 8 and (count * phrase_len) / len(words) >= 0.7:
            return True

    return False


def transcribe(audio_path, model_size="base", language="en"):
    """Transcribe audio file using local Whisper model."""
    stats = audio_stats(audio_path)
    if (
        stats["duration"] < MIN_AUDIO_SECONDS
        or stats["peak"] < MIN_PEAK_LEVEL
        or stats["rms"] < MIN_RMS_LEVEL
    ):
        return "", stats

    model = whisper.load_model(model_size)
    result = model.transcribe(
        audio_path,
        language=language,
        task="transcribe",
        temperature=0,
        condition_on_previous_text=False,
        no_speech_threshold=0.65,
        logprob_threshold=-1.0,
        compression_ratio_threshold=2.4,
    )
    text = result["text"].strip()

    if looks_like_repetition(text):
        return "", stats

    return text, stats

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file provided"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else "en"
    
    try:
        text, stats = transcribe(audio_path, model_size, language)
        print(json.dumps({"text": text, "stats": stats}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

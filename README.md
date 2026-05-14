# 2lazy2type 🎙️

**Don't type. Just talk.**

I made this project because, frankly, I'm lazy. I don't want to type. People are "vibe coding" now, but even that feels like too much work. Plus, I can't afford Whisper Flow (I'm poor). In a world where everyone operates by "quotes," why are we still typing? We should just talk. But we need a way to do that locally—fast, private, and offline. That's why **2lazy2type** exists.

`2lazy2type` is a lightning-fast, terminal-based voice transcription tool. It captures your voice and uses OpenAI's **Whisper** model running locally on your machine to turn speech into text. No clouds, no APIs, no fees. Just you and your terminal.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Node](https://img.shields.io/badge/node-v18%2B-green.svg) ![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)




---


## ✨ Features

- **🔒 100% Local**: Powered by OpenAI's Whisper running locally on your machine. Your voice never leaves your computer.
- **⚡ Hotkey Driven**: 
  - `SPACE` to Record / Stop
  - `M` to Change Model
  - `R` to Re-transcribe (Smart Retry)
  - `C` to Cancel
- **🎯 Smart Retry**: Transcription not accurate enough? Press `R` to instantly re-process the last recording with a larger, more accurate model.
- **🏎️ Flexible Models**: Choose from `tiny` (blazing fast) to `large` (human-level accuracy).
- **📝 Clean Output**: Transcription is outputted plainly, making it perfect for quick copying with your mouse.

## 🚀 Prerequisites

Before you start, ensure you have the following installed:

1.  **Node.js 18+**
2.  **Python 3.8+**
3.  **FFmpeg** & **SoX** (Required for audio processing)

### System Dependencies

**macOS**
```bash
brew install ffmpeg sox
```

**Ubuntu / Linux**
```bash
sudo apt update
sudo apt install python3-pip ffmpeg sox libsox-fmt-all
```

**Windows** (via [Chocolatey](https://chocolatey.org/))
```powershell
choco install ffmpeg sox.portable
```

## 📦 Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/2lazy2type.git
    cd 2lazy2type
    ```

2.  Install Node.js dependencies:
    ```bash
    npm install
    ```

3.  Install Python dependencies (Whisper):
    ```bash
    pip install openai-whisper
    ```
    *(Note: This may require a fair amount of disk space for PyTorch)*

    If you use conda, activate the environment first. The app will prefer the active conda interpreter:
    ```bash
    conda activate mainenv
    pip install openai-whisper
    ```

    You can also force a specific interpreter:
    ```bash
    export LAZY2TYPE_PYTHON="$CONDA_PREFIX/bin/python"
    ```

4.  Check if everything is ready:
    ```bash
    npm run doctor
    ```

## 🎮 Usage

Start the application:

```bash
npm start
```

### The Workflow

1.  **Select a Model**: On first run, you'll pick a Whisper model.
    -   `tiny`/`base`: Fast, good for clear speech.
    -   `turbo`/`small`: Great balance.
    -   `medium`/`large`: Best accuracy, slower.
2.  **Record**: Press **`SPACE`** to start recording. Talk away!
3.  **Transcribe**: Press **`SPACE`** again to stop. The app will process your audio and display the text.
4.  **Iterate**: 
    -   Need better accuracy? Press **`R`** to re-try with the next better model.
    -   Want to change default model? Press **`M`**.
    -   Done? Press **`ESC`** to exit.

## 🛠️ Configuration

Your settings (like preferred model) are saved automatically.

-   **macOS**: `~/Library/Preferences/2lazy2type-nodejs/`
-   **Linux**: `~/.config/2lazy2type-nodejs/`
-   **Windows**: `%APPDATA%\2lazy2type-nodejs\Config\`

To reset configurations, simply delete the folder or files within.

### Microphone troubleshooting

On macOS, make sure the terminal app you run `npm start` from has microphone permission in **System Settings → Privacy & Security → Microphone**.

The recorder uses SoX directly and writes 16 kHz mono WAV files for Whisper. If your default input is wrong, set the device before starting:

```bash
export LAZY2TYPE_AUDIO_DEVICE="Your Input Device Name"
npm start
```

If recordings are silent, `2lazy2type` now reports that instead of sending silence/noise to Whisper, which prevents repeated hallucinated text.

## 🤝 Contributing

We're too lazy to write a contribution guide, but PRs are welcome! 

## 📄 License

MIT © [Brian Liao]

import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import chalk from 'chalk';

const execAsync = util.promisify(exec);

export async function checkRequirements() {
    const platform = os.platform();
    const isWin = platform === 'win32';
    const missing = [];
    let pythonCommand = 'python3';

    console.log(chalk.blue('Checking system requirements...'));

    // 1. Check Python
    try {
        await execAsync(`${pythonCommand} --version`);
    } catch (e) {
        if (isWin) {
            try {
                // Try 'python' on Windows if 'python3' fails
                await execAsync('python --version');
                pythonCommand = 'python';
            } catch (e2) {
                missing.push('Python 3 (not found as "python3" or "python")');
            }
        } else {
            missing.push('Python 3');
        }
    }

    // 2. Check OpenAI Whisper (Python package)
    if (!missing.includes('Python 3') && !missing.includes('Python 3 (not found as "python3" or "python")')) {
        try {
            await execAsync(`${pythonCommand} -c "import whisper"`);
        } catch (e) {
            missing.push('openai-whisper (Python package)');
        }
    }

    // 3. Check FFmpeg (required for Whisper)
    try {
        await execAsync('ffmpeg -version');
    } catch (e) {
        missing.push('FFmpeg');
    }

    // 4. Check Audio Recording Tools
    if (isWin) {
        try {
            await execAsync('sox --version');
        } catch (e) {
            missing.push('SoX (Sound eXchange)');
        }
    } else {
        // macOS and Linux usually use 'rec' which is part of SoX
        try {
            await execAsync('rec --version');
        } catch (e) {
            console.log(chalk.yellow("  'rec' command not found, checking for 'sox'..."));
            missing.push('SoX (specifically the "rec" command)');
        }

        // Check for clipboard tools on Linux
        if (platform === 'linux') {
            try {
                // Check for any of the supported clipboard tools
                await Promise.any([
                    execAsync('xsel --version'),
                    execAsync('xclip -version'),
                    execAsync('wl-copy --version')
                ]);
            } catch (e) {
                // All failed
                missing.push('Clipboard utility (xsel, xclip, or wl-copy)');
            }
        }
    }

    if (missing.length > 0) {
        console.error(chalk.red('\nMissing requirements:'));
        missing.forEach(req => console.error(chalk.red(` - ${req}`)));

        console.log(chalk.yellow('\nPlease install the missing tools:'));

        if (missing.some(m => m.includes('Python'))) {
            console.log(' - Install Python 3.8+: https://www.python.org/downloads/');
        }
        if (missing.some(m => m.includes('openai-whisper'))) {
            console.log(` - Install Whisper: ${pythonCommand} -m pip install openai-whisper`);
        }
        if (missing.some(m => m.includes('FFmpeg'))) {
            if (platform === 'darwin') console.log(' - Mac: brew install ffmpeg');
            else if (platform === 'linux') console.log(' - Linux: sudo apt install ffmpeg');
            else console.log(' - Windows: choco install ffmpeg (or download from website)');
        }
        if (missing.some(m => m.includes('SoX'))) {
            if (platform === 'darwin') console.log(' - Mac: brew install sox');
            else if (platform === 'linux') console.log(' - Linux: sudo apt install sox');
            else console.log(' - Windows: Download SoX from SourceForge and add to PATH, or "choco install sox.portable"');
        }
        if (missing.some(m => m.includes('Clipboard'))) {
            console.log(' - Linux: sudo apt install xsel (or xclip, wl-clipboard)');
        }

        return { ok: false, pythonCommand };
    }

    console.log(chalk.green('All system requirements met.\n'));
    return { ok: true, pythonCommand };
}

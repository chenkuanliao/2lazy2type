import { exec, execFile } from 'child_process';
import util from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

const execAsync = util.promisify(exec);
const execFileAsync = util.promisify(execFile);

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function pythonPathsForEnv(envPath, isWin) {
    return isWin
        ? [path.join(envPath, 'Scripts', 'python.exe')]
        : [path.join(envPath, 'bin', 'python3'), path.join(envPath, 'bin', 'python')];
}

function getPythonCandidates(isWin) {
    const candidates = [
        process.env.LAZY2TYPE_PYTHON,
        process.env.PYTHON
    ];

    if (process.env.VIRTUAL_ENV) {
        candidates.push(...pythonPathsForEnv(process.env.VIRTUAL_ENV, isWin));
    }

    if (process.env.CONDA_PREFIX) {
        candidates.push(
            isWin
                ? path.join(process.env.CONDA_PREFIX, 'python.exe')
                : path.join(process.env.CONDA_PREFIX, 'bin', 'python')
        );
    }

    for (const envDir of [
        path.join(process.cwd(), '.venv'),
        path.join(process.cwd(), 'venv'),
        path.join(process.cwd(), 'env'),
        path.join(process.cwd(), '..', 'mainenv')
    ]) {
        if (fs.existsSync(envDir)) {
            candidates.push(...pythonPathsForEnv(envDir, isWin));
        }
    }

    candidates.push('python3', 'python');
    return unique(candidates);
}

async function commandWorks(command, args) {
    try {
        await execFileAsync(command, args);
        return true;
    } catch (e) {
        return false;
    }
}

async function findPythonWithWhisper(isWin) {
    let firstPython = null;

    for (const candidate of getPythonCandidates(isWin)) {
        const hasPython = await commandWorks(candidate, ['--version']);
        if (!hasPython) continue;

        firstPython ||= candidate;

        const hasWhisper = await commandWorks(candidate, ['-c', 'import whisper']);
        if (hasWhisper) {
            return { pythonCommand: candidate, hasPython: true, hasWhisper: true };
        }
    }

    return {
        pythonCommand: firstPython || 'python3',
        hasPython: Boolean(firstPython),
        hasWhisper: false
    };
}

export async function checkRequirements() {
    const platform = os.platform();
    const isWin = platform === 'win32';
    const missing = [];

    console.log(chalk.blue('Checking system requirements...'));

    // 1-2. Check Python and OpenAI Whisper in the same interpreter.
    const { pythonCommand, hasPython, hasWhisper } = await findPythonWithWhisper(isWin);
    if (!hasPython) {
        missing.push(isWin ? 'Python 3 (not found as "python3" or "python")' : 'Python 3');
    } else if (!hasWhisper) {
        missing.push('openai-whisper (Python package)');
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

        if (missing.some(m => m.startsWith('Python 3'))) {
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

    console.log(chalk.green('All system requirements met.'));
    console.log(chalk.dim(`Using Python: ${pythonCommand}\n`));
    return { ok: true, pythonCommand };
}

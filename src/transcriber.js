import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'scripts', 'transcribe.py');

let currentProcess = null;
let isCancelled = false;

export async function transcribe(audioFilePath, modelOverride = null) {
    const whisperModel = modelOverride || config.get('whisperModel') || 'base';
    const whisperLanguage = config.get('whisperLanguage') || 'en';
    isCancelled = false;

    return new Promise((resolve, reject) => {
        const pythonCommand = config.get('pythonCommand') || 'python3';
        currentProcess = spawn(pythonCommand, [scriptPath, audioFilePath, whisperModel, whisperLanguage]);

        let stdout = '';
        let stderr = '';

        currentProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        currentProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        currentProcess.on('close', (code) => {
            currentProcess = null;

            if (isCancelled) {
                reject(new Error('CANCELLED'));
                return;
            }

            if (code !== 0) {
                reject(new Error(`Whisper failed: ${stderr || 'Unknown error'}`));
                return;
            }

            try {
                const result = JSON.parse(stdout);
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve({
                        text: result.text || '',
                        stats: result.stats || null,
                    });
                }
            } catch (e) {
                reject(new Error(`Failed to parse Whisper output: ${stdout}`));
            }
        });

        currentProcess.on('error', (err) => {
            currentProcess = null;
            reject(new Error(`Failed to run Whisper: ${err.message}. Make sure Python and whisper are installed.`));
        });
    });
}

export function cancelTranscription() {
    if (currentProcess) {
        isCancelled = true;
        currentProcess.kill('SIGTERM');
        currentProcess = null;
        return true;
    }
    return false;
}

export function isTranscribing() {
    return currentProcess !== null;
}

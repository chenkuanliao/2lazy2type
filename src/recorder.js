import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as config from './config.js';

const recordingsDir = os.tmpdir();


let recorderProcess = null;
let currentFilePath = null;
let recordingStderr = '';
let closePromise = null;
let closeError = null;

function getRecorderCommand(filePath) {
    if (process.platform === 'win32') {
        return {
            command: 'sox',
            args: [
                '-q',
                '-t', 'waveaudio',
                'default',
                '-c', '1',
                '-r', '16000',
                '-b', '16',
                '-e', 'signed-integer',
                filePath
            ]
        };
    }

    return {
        command: 'rec',
        args: [
            '-q',
            '-c', '1',
            '-r', '16000',
            '-b', '16',
            '-e', 'signed-integer',
            '-t', 'wav',
            filePath
        ]
    };
}

function waitForRecorderClose() {
    if (!closePromise) {
        return Promise.resolve();
    }
    return closePromise;
}

async function finishRecording(signal = 'SIGINT') {
    if (!recorderProcess) {
        throw new Error('No recording in progress');
    }

    const processToStop = recorderProcess;
    processToStop.kill(signal);

    await waitForRecorderClose();
    recorderProcess = null;
    closePromise = null;

    if (closeError) {
        const error = closeError;
        closeError = null;
        throw error;
    }

    if (!currentFilePath || !fs.existsSync(currentFilePath)) {
        throw new Error(`Recording file was not created${recordingStderr ? `: ${recordingStderr.trim()}` : ''}`);
    }

    const stats = fs.statSync(currentFilePath);
    if (stats.size < 1024) {
        throw new Error(`Recording file is empty or incomplete${recordingStderr ? `: ${recordingStderr.trim()}` : ''}`);
    }

    return currentFilePath;
}

export function startRecording() {
    return new Promise((resolve, reject) => {
        const filename = `recording_${Date.now()}.wav`;
        currentFilePath = path.join(recordingsDir, filename);
        recordingStderr = '';
        closeError = null;

        const { command, args } = getRecorderCommand(currentFilePath);
        const env = { ...process.env };
        const audioDevice = config.get('audioDevice') || process.env.LAZY2TYPE_AUDIO_DEVICE;
        if (audioDevice) {
            env.AUDIODEV = audioDevice;
        }

        recorderProcess = spawn(command, args, { env });
        closePromise = new Promise((closeResolve) => {
            recorderProcess.once('close', (code, signal) => {
                if (code && code !== 0 && signal !== 'SIGINT' && signal !== 'SIGTERM') {
                    closeError = new Error(recordingStderr.trim() || `${command} exited with code ${code}`);
                }
                closeResolve();
            });
        });

        recorderProcess.stderr.on('data', (data) => {
            recordingStderr += data.toString();
        });

        recorderProcess.once('error', (err) => {
            closeError = err;
            recorderProcess = null;
            closePromise = null;
            reject(err);
        });

        resolve(currentFilePath);
    });
}

export function stopRecording() {
    return finishRecording('SIGINT');
}

export function cancelRecording() {
    return new Promise((resolve) => {
        if (!recorderProcess) {
            resolve(null);
            return;
        }

        const filePath = currentFilePath;
        finishRecording('SIGTERM')
            .catch(() => null)
            .finally(() => {
                currentFilePath = null;
                if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                resolve();
            });
    });
}

export function isCurrentlyRecording() {
    return recorderProcess !== null;
}

export function cleanupRecording(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

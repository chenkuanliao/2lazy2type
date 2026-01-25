import AudioRecorder from 'node-audiorecorder';
import fs from 'fs';
import path from 'path';
import os from 'os';

const recordingsDir = os.tmpdir();


let recorder = null;
let currentFilePath = null;
let fileStream = null;

export function startRecording() {
    return new Promise((resolve, reject) => {
        const filename = `recording_${Date.now()}.wav`;
        currentFilePath = path.join(recordingsDir, filename);

        recorder = new AudioRecorder({
            program: process.platform === 'win32' ? 'sox' : 'rec',
            silence: 0,
            thresholdStart: null,
            thresholdStop: null,
            keepSilence: true,
        }, console);

        fileStream = fs.createWriteStream(currentFilePath, { encoding: 'binary' });

        recorder.start().stream().pipe(fileStream);

        recorder.stream().on('error', (err) => {
            reject(err);
        });

        resolve(currentFilePath);
    });
}

export function stopRecording() {
    return new Promise((resolve, reject) => {
        if (!recorder) {
            reject(new Error('No recording in progress'));
            return;
        }

        recorder.stop();

        // Give it a moment to finish writing
        setTimeout(() => {
            if (fileStream) {
                fileStream.end();
            }
            resolve(currentFilePath);
            recorder = null;
            fileStream = null;
        }, 500);
    });
}

export function cancelRecording() {
    return new Promise((resolve) => {
        if (!recorder) {
            resolve(null);
            return;
        }

        recorder.stop();

        // Give it a moment, then cleanup the file
        setTimeout(() => {
            if (fileStream) {
                fileStream.end();
            }
            const filePath = currentFilePath;
            recorder = null;
            fileStream = null;
            currentFilePath = null;

            // Delete the partial recording
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            resolve();
        }, 300);
    });
}

export function isCurrentlyRecording() {
    return recorder !== null;
}

export function cleanupRecording(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import clipboardy from 'clipboardy';
import { runSetup, selectWhisperModel, pickModel } from './ui/menu.js';
import * as recording from './ui/recording.js';
import { startRecording, stopRecording, cancelRecording, cleanupRecording } from './recorder.js';
import { transcribe, cancelTranscription } from './transcriber.js';
import * as config from './config.js';
import { checkRequirements } from './requirements.js';

// State
let isRecording = false;
let isProcessing = false;
let currentAudioPath = null;
let lastRecordingPath = null;
let lastUsedModel = null;

async function handleCancelRecording() {
    if (!isRecording) return;

    recording.showRecordingCancelled();
    await cancelRecording();
    isRecording = false;
    currentAudioPath = null;
    recording.showWaitingForInput();
}

async function handleCancelProcessing() {
    if (!isProcessing) return;

    const cancelled = cancelTranscription();
    if (cancelled) {
        recording.showTranscriptionCancelled();
    }
    // The rest is handled in processRecording's catch block
}

async function processRecording(audioPath, modelOverride = null) {
    isProcessing = true;
    lastUsedModel = modelOverride || config.get('whisperModel') || 'base';
    const spinner = recording.createSpinner(`Transcribing audio (${lastUsedModel})...`);
    spinner.start();

    try {
        // Transcribe with Whisper
        const result = await transcribe(audioPath, modelOverride);
        const text = result.text;
        spinner.stop();

        if (!text || text.trim() === '') {
            if (result.stats && result.stats.peak < 0.01) {
                recording.showError('No speech detected. The recording looks silent, so check your macOS microphone input/permission or set LAZY2TYPE_AUDIO_DEVICE.');
            } else {
                recording.showError('No speech detected in recording');
            }
            return;
        }

        // Show the transcription
        recording.showTranscription(text);

        // Copy to clipboard
        try {
            await clipboardy.write(text);
            recording.showClipboardSuccess();
        } catch (error) {
            recording.showError(`Failed to copy to clipboard: ${error.message}`);
        }

        // Save as last successful recording
        lastRecordingPath = audioPath;

    } catch (error) {
        spinner.stop();

        // Don't show error if it was cancelled
        if (error.message !== 'CANCELLED') {
            recording.showError(error.message);
        }
    } finally {
        // Do NOT cleanup recording here to allow re-transcription
        // cleanupRecording(currentAudioPath);
        // currentAudioPath = null;
        isProcessing = false;

        // Re-enable raw mode in case spinner affected it
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
    }
}

async function handleModelChange() {
    // Can only change model when not recording or processing
    if (isRecording || isProcessing) {
        return;
    }

    try {
        // Temporarily disable raw mode for inquirer
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }

        const model = await selectWhisperModel();
        recording.showModelChanged(model);

        // Re-enable raw mode
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();

        recording.showWaitingForInput();
    } catch (error) {
        // Re-enable raw mode if something went wrong
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        recording.showError(`Failed to change model: ${error.message}`);
        recording.showWaitingForInput();
    }
}

async function handleKeypress(key) {
    // ESC key - exit app
    if (key.name === 'escape' || key.sequence === '\x1B') {
        // Clean up any in-progress operations
        if (isRecording) {
            await cancelRecording();
        }
        if (isProcessing) {
            cancelTranscription();
        }
        if (lastRecordingPath) {
            cleanupRecording(lastRecordingPath);
        }
        recording.showGoodbye();
        process.exit(0);
    }

    // C key - cancel current operation
    if (key.name === 'c' || key.sequence === 'c' || key.sequence === 'C') {
        if (isRecording) {
            await handleCancelRecording();
            return;
        }
        if (isProcessing) {
            await handleCancelProcessing();
            return;
        }
    }

    // M key - change model
    if ((key.name === 'm' || key.sequence === 'm' || key.sequence === 'M') && !isRecording && !isProcessing) {
        await handleModelChange();
        return;
    }

    // R key - re-transcribe
    if ((key.name === 'r' || key.sequence === 'r' || key.sequence === 'R') && !isRecording && !isProcessing) {
        if (!lastRecordingPath) {
            recording.showError('No recording available to re-transcribe');
            recording.showWaitingForInput();
            return;
        }

        try {
            // Temporarily disable raw mode for inquirer
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }

            const currentModelId = lastUsedModel || config.get('whisperModel') || 'base';
            const nextModel = await pickModel(currentModelId);

            // Re-enable raw mode
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }
            process.stdin.resume();

            recording.showModelChanged(nextModel + " (Temporary for retry)");
            await processRecording(lastRecordingPath, nextModel);
            recording.showWaitingForInput();
        } catch (error) {
            // Re-enable raw mode if something went wrong
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }
            process.stdin.resume();
            recording.showError(`Failed to select model: ${error.message}`);
            recording.showWaitingForInput();
        }
        return;
    }

    // Space key - toggle recording
    if (key.name === 'space' || key.sequence === ' ') {
        // Ignore if currently processing a transcription
        if (isProcessing) {
            return;
        }

        if (!isRecording) {
            // Start recording
            try {
                // Cleanup previous recording if exists
                if (lastRecordingPath) {
                    cleanupRecording(lastRecordingPath);
                    lastRecordingPath = null;
                }

                isRecording = true;
                currentAudioPath = await startRecording();
                recording.showRecordingStart();
                recording.showRecordingInstructions();
            } catch (error) {
                isRecording = false;
                recording.showError(`Failed to start recording: ${error.message}`);
                recording.showWaitingForInput();
            }
        } else {
            // Stop recording
            try {
                recording.showRecordingStop();
                await stopRecording();
                isRecording = false;

                await processRecording(currentAudioPath);
                recording.showWaitingForInput();
            } catch (error) {
                isRecording = false;
                recording.showError(`Recording error: ${error.message}`);
                cleanupRecording(currentAudioPath);
                currentAudioPath = null;
                recording.showWaitingForInput();
            }
        }
    }
}

async function main() {
    try {
        // Check system requirements
        const { ok, pythonCommand } = await checkRequirements();
        if (!ok) {
            process.exit(1);
        }

        // Update python command in config if needed
        if (pythonCommand !== config.get('pythonCommand')) {
            config.set('pythonCommand', pythonCommand);
        }

        // Run setup - just select Whisper model
        await runSetup();

        // Enable raw mode for keypress detection
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }

        // Show instructions
        recording.showWaitingForInput();

        // Listen for keypresses
        process.stdin.on('keypress', (str, key) => {
            if (key) {
                handleKeypress(key);
            }
        });

        // Prevent stdin from ending the process unexpectedly
        process.stdin.on('end', () => {
            // Ignore stdin end - keep running until ESC is pressed
        });

        process.stdin.on('close', () => {
            // Ignore stdin close - keep running until ESC is pressed
        });

        process.stdin.on('error', (err) => {
            // Log but don't exit on stdin errors
            console.error(chalk.yellow(`\nStdin error: ${err.message}`));
        });

        // Keep the process running
        process.stdin.resume();

        // Prevent the process from exiting on its own
        setInterval(() => { }, 1 << 30);

    } catch (error) {
        console.error(chalk.red(`\nFatal error: ${error.message}`));
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    // Clean up any in-progress operations
    if (isRecording) {
        await cancelRecording();
    }
    if (isProcessing) {
        cancelTranscription();
    }
    if (lastRecordingPath) {
        cleanupRecording(lastRecordingPath);
    }
    recording.showGoodbye();
    process.exit(0);
});

main();

import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import * as config from '../config.js';

export const MODELS = [
    { name: 'tiny', speed: '32x' },
    { name: 'base', speed: '16x' },
    { name: 'small', speed: '6x' },
    { name: 'medium', speed: '2x' },
    { name: 'large', speed: '1x' },
    { name: 'turbo', speed: '8x' }
];

// Sort models by speed (fastest to slowest) for the menu
// But the user said "order that the model is listed" for the "next level". 
// Usually "next level" means "more accurate".
// The list above is roughly ordered by accuracy: tiny -> base -> small -> medium -> large.
// Turbo is a special case (large-v3 logic but faster).
// Let's stick to the list defined in the previous version but with objects.
// The previous list was: ['tiny', 'base', 'turbo', 'small', 'medium', 'large']
// Let's keep that order as the "listing order" unless I should sort it?
// User said: "using the next model in the order... next level based on the order that the model is listed"
// I will keep the previous order but add metadata.

export const MODEL_LIST = [
    { id: 'tiny', label: 'tiny', speed: '~32x faster' },
    { id: 'base', label: 'base', speed: '~16x faster' },
    { id: 'turbo', label: 'turbo', speed: '~8x faster' },
    { id: 'small', label: 'small', speed: '~6x faster' },
    { id: 'medium', label: 'medium', speed: '~2x faster' },
    { id: 'large', label: 'large', speed: '1x (Baseline)' }
];

export async function selectWhisperModel() {
    const currentModel = config.get('whisperModel') || 'base';

    const model = await select({
        message: 'Select Whisper model (speed vs accuracy):',
        choices: MODEL_LIST.map(m => ({
            name: `${m.label.padEnd(8)} - ${m.speed}${m.id === currentModel ? ' (current)' : ''}`,
            value: m.id,
        })),
        default: currentModel,
    });

    config.set('whisperModel', model);
    return model;
}

export async function runSetup() {
    console.log(chalk.bold.cyan('\n🎤 2lazy2type - Voice Transcription\n'));

    const whisperModel = await selectWhisperModel();

    console.log(chalk.green('\n✓ Ready!'));
    console.log(chalk.dim(`  Whisper model: ${whisperModel}\n`));

    return { whisperModel };
}

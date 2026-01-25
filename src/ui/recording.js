import chalk from 'chalk';
import ora from 'ora';

let recordingStartTime = null;
let updateInterval = null;

export function showRecordingStart() {
    recordingStartTime = Date.now();

    console.log('\n' + chalk.bgRed.white.bold(' 🔴 RECORDING '));

    // Update duration every second
    updateInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        process.stdout.write(`\r${chalk.red('●')} Recording: ${chalk.bold(timeStr)}`);
    }, 1000);
}

export function showRecordingStop() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }

    const elapsed = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 0;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    console.log(`\n\n${chalk.green('✓')} Recording stopped (${timeStr})`);
    recordingStartTime = null;
}

export function createSpinner(text) {
    return ora({
        text: text + chalk.dim(' (press C to cancel)'),
        spinner: 'dots',
    });
}

export function showWaitingForInput() {
    console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold('  Press SPACE to start recording'));
    console.log(chalk.dim('  Press M to change Whisper model'));
    console.log(chalk.dim('  Press R to re-transcribe with better model'));
    console.log(chalk.dim('  Press ESC to exit'));
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

export function showRecordingInstructions() {
    console.log(chalk.dim('Press SPACE to stop, or C to cancel...\n'));
}

export function showRecordingCancelled() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    console.log(`\n\n${chalk.yellow('⚠')} Recording cancelled`);
    recordingStartTime = null;
}

export function showTranscriptionCancelled() {
    console.log(`\n${chalk.yellow('⚠')} Transcription cancelled`);
}

export function showTranscription(text) {
    console.log(chalk.green('\n📝 Transcription:'));
    console.log(chalk.dim('─'.repeat(44)));

    // Display transcription - no decorations for easy copying
    console.log(chalk.white(text));

    console.log(chalk.dim('─'.repeat(44)));
    console.log('');
}

export function showError(message) {
    console.log(chalk.red(`\n❌ Error: ${message}\n`));
}

export function showGoodbye() {
    console.log(chalk.cyan('\n👋 Goodbye!\n'));
}

export function showModelChanged(model) {
    console.log(chalk.green(`\n✓ Whisper model changed to: ${chalk.bold(model)}`));
}

export function showClipboardSuccess() {
    console.log(chalk.dim('  (Copied to clipboard)'));
}

import Conf from 'conf';

const config = new Conf({
  projectName: '2lazy2type',
  defaults: {
    provider: 'lmstudio',
    model: '',
    lmstudioUrl: 'http://localhost:1234/v1',
    ollamaUrl: 'http://localhost:11434/v1',
    openaiApiKey: '',
    geminiApiKey: '',
    whisperModel: 'base', // Local Whisper model: tiny, base, small, medium, large, turbo
  }
});

export function get(key) {
  return config.get(key);
}

export function set(key, value) {
  config.set(key, value);
}

export function getAll() {
  return config.store;
}

export default config;

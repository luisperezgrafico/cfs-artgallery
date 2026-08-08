import { store } from './blobStore';
import { getSettings, type AudioSettings, type Submission } from './storage';
import type { ImageMetadata } from '../types/museum';
import {
  audioTextSignature,
  buildNarrationTextFromSource,
  type NarrationSource,
} from '../utils/audioNarrationText';

export interface ArtworkAudio {
  url: string;
  generatedAt: string;
  voice: string;
  textSignature: string;
}

interface OpenAiCompatibleTtsConfig {
  provider: 'local' | 'openai';
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  format: string;
  timeoutMs: number;
}

interface ElevenLabsTtsConfig {
  provider: 'elevenlabs';
  apiKeys: string[];
  voiceId: string;
  modelId: string;
  outputFormat: string;
  timeoutMs: number;
}

type TtsConfig = OpenAiCompatibleTtsConfig | ElevenLabsTtsConfig;

function trimSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function positiveTimeout(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function elevenLabsApiKeys(settings: AudioSettings['elevenlabs']): string[] {
  return uniqueValues([
    settings.apiKey,
    ...(settings.apiKeys ?? []),
    ...(process.env.ELEVENLABS_API_KEYS?.split(',') ?? []),
    process.env.ELEVENLABS_API_KEY ?? '',
  ]);
}

function envTtsConfig(): TtsConfig | null {
  const explicitBaseUrl = process.env.TTS_BASE_URL?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = process.env.TTS_API_KEY?.trim() || openAiKey || '';
  const baseUrl = explicitBaseUrl || (openAiKey ? 'https://api.openai.com/v1' : '');

  if (!baseUrl) return null;

  const timeoutMs = Number(process.env.TTS_TIMEOUT_MS);

  return {
    provider: explicitBaseUrl ? 'local' : 'openai',
    baseUrl: trimSlash(baseUrl),
    apiKey,
    model: process.env.TTS_MODEL?.trim() || 'gpt-4o-mini-tts',
    voice: process.env.TTS_VOICE?.trim() || 'coral',
    format: process.env.TTS_FORMAT?.trim() || 'mp3',
    timeoutMs: positiveTimeout(timeoutMs, 60_000),
  };
}

function configuredTtsConfig(settings: AudioSettings): TtsConfig | null {
  if (settings.provider === 'disabled') return null;

  if (settings.provider === 'local') {
    const baseUrl = settings.local.baseUrl.trim() || process.env.TTS_BASE_URL?.trim() || '';
    if (!baseUrl) return envTtsConfig();
    return {
      provider: 'local',
      baseUrl: trimSlash(baseUrl),
      apiKey: settings.local.apiKey.trim() || process.env.TTS_API_KEY?.trim() || '',
      model: settings.local.model.trim() || 'tts-models',
      voice: settings.local.voice.trim() || 'xtts_en_bella_ref',
      format: settings.local.format.trim() || 'mp3',
      timeoutMs: positiveTimeout(Number(settings.local.timeoutMs), 120_000),
    };
  }

  if (settings.provider === 'openai') {
    const apiKey = settings.openai.apiKey.trim() || process.env.OPENAI_API_KEY?.trim() || '';
    if (!apiKey) return envTtsConfig();
    return {
      provider: 'openai',
      baseUrl: trimSlash(settings.openai.baseUrl.trim() || 'https://api.openai.com/v1'),
      apiKey,
      model: settings.openai.model.trim() || 'gpt-4o-mini-tts',
      voice: settings.openai.voice.trim() || 'coral',
      format: settings.openai.format.trim() || 'mp3',
      timeoutMs: positiveTimeout(Number(settings.openai.timeoutMs), 60_000),
    };
  }

  const apiKeys = elevenLabsApiKeys(settings.elevenlabs);
  const voiceId = settings.elevenlabs.voiceId.trim() || process.env.ELEVENLABS_VOICE_ID?.trim() || '';
  if (apiKeys.length === 0 || !voiceId) return envTtsConfig();

  return {
    provider: 'elevenlabs',
    apiKeys,
    voiceId,
    modelId: settings.elevenlabs.modelId.trim() || process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2',
    outputFormat: settings.elevenlabs.outputFormat.trim() || process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || 'mp3_44100_128',
    timeoutMs: positiveTimeout(Number(settings.elevenlabs.timeoutMs), 120_000),
  };
}

async function readTtsConfig(): Promise<TtsConfig | null> {
  const settings = await getSettings();
  return configuredTtsConfig(settings.audioSettings);
}

function assertSafeBackendUrl(baseUrl: string): void {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('TTS_BASE_URL must be http or https.');
  }
  if (parsed.hostname === '169.254.169.254' || parsed.hostname.startsWith('169.254.')) {
    throw new Error('TTS_BASE_URL cannot point at link-local metadata addresses.');
  }
}

function authorizationHeader(apiKey: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

function extensionForConfig(config: TtsConfig): string {
  if (config.provider === 'elevenlabs') {
    return config.outputFormat.split('_')[0] || 'mp3';
  }
  return config.format;
}

function voiceLabel(config: TtsConfig): string {
  return config.provider === 'elevenlabs' ? config.voiceId : config.voice;
}

async function fetchElevenLabsSpeech(config: ElevenLabsTtsConfig, text: string): Promise<Response> {
  let lastError: Error | null = null;

  for (const apiKey of config.apiKeys) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), config.timeoutMs);

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=${encodeURIComponent(config.outputFormat)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: config.modelId,
          }),
          signal: abortController.signal,
          redirect: 'manual',
        },
      );

      if (response.ok) return response;

      const message = await response.text().catch(() => 'TTS request failed');
      lastError = new Error(`TTS request failed (${response.status}): ${message}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('TTS request failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('TTS request failed.');
}

async function generateAudioForSource(source: NarrationSource): Promise<ArtworkAudio | null> {
  const text = buildNarrationTextFromSource(source);
  if (!text) return null;

  const config = await readTtsConfig();
  if (!config) return null;

  let response: Response;
  if (config.provider === 'elevenlabs') {
    response = await fetchElevenLabsSpeech(config, text);
  } else {
    assertSafeBackendUrl(config.baseUrl);

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), config.timeoutMs);
    try {
      response = await fetch(`${config.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authorizationHeader(config.apiKey),
        },
        body: JSON.stringify({
          model: config.model,
          voice: config.voice,
          input: text,
          response_format: config.format,
        }),
        signal: abortController.signal,
        redirect: 'manual',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!response.ok) {
    const message = await response.text().catch(() => 'TTS request failed');
    throw new Error(`TTS request failed (${response.status}): ${message}`);
  }

  const extension = extensionForConfig(config);
  const contentType = response.headers.get('content-type') || `audio/${extension}`;
  const audio = await response.blob();
  const file = await store.putFile(`gallery/audio/${source.id ?? 'artwork'}-${Date.now()}.${extension}`, audio, contentType);

  return {
    url: file.url,
    generatedAt: new Date().toISOString(),
    voice: voiceLabel(config),
    textSignature: audioTextSignature(source),
  };
}

export function buildNarrationText(submission: Submission): string {
  return buildNarrationTextFromSource(submission);
}

export function buildArtworkNarrationText(artwork: ImageMetadata): string {
  const id = artwork.id ?? artwork.url;
  return buildNarrationTextFromSource({ ...artwork, id });
}

export async function generateArtworkAudio(submission: Submission): Promise<ArtworkAudio | null> {
  return generateAudioForSource(submission);
}

export async function generateAudioForArtwork(artwork: ImageMetadata): Promise<ArtworkAudio | null> {
  const id = artwork.id ?? artwork.url;
  return generateAudioForSource({ ...artwork, id });
}

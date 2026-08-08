import { store } from './blobStore';
import type { Submission } from './storage';
import type { ImageMetadata } from '../types/museum';

export interface ArtworkAudio {
  url: string;
  generatedAt: string;
  voice: string;
}

interface TtsConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  format: string;
  timeoutMs: number;
}

const MAX_TTS_INPUT_CHARS = 4096;

function trimSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function readTtsConfig(): TtsConfig | null {
  const explicitBaseUrl = process.env.TTS_BASE_URL?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = process.env.TTS_API_KEY?.trim() || openAiKey || '';
  const baseUrl = explicitBaseUrl || (openAiKey ? 'https://api.openai.com/v1' : '');

  if (!baseUrl) return null;

  const timeoutMs = Number(process.env.TTS_TIMEOUT_MS);

  return {
    baseUrl: trimSlash(baseUrl),
    apiKey,
    model: process.env.TTS_MODEL?.trim() || 'gpt-4o-mini-tts',
    voice: process.env.TTS_VOICE?.trim() || 'coral',
    format: process.env.TTS_FORMAT?.trim() || 'mp3',
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60_000,
  };
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

function truncateForTts(text: string): string {
  if (text.length <= MAX_TTS_INPUT_CHARS) return text;
  return `${text.slice(0, MAX_TTS_INPUT_CHARS - 1).trimEnd()}.`;
}

interface NarrationSource {
  id: string;
  title: string;
  artist: string;
  year?: string;
  date?: string;
  medium?: string;
  shortDescription?: string;
  statement?: string;
  longDescription?: string;
}

function buildNarrationTextFromSource(source: NarrationSource): string {
  const meta = [
    source.title,
    source.artist ? `by ${source.artist}` : '',
    source.year ?? source.date,
    source.medium,
  ].filter(Boolean).join(', ');

  const body = [
    source.shortDescription,
    source.statement ?? source.longDescription,
  ].filter((part): part is string => typeof part === 'string')
    .map(part => part.trim())
    .filter(Boolean)
    .join('\n\n');

  if (!body) return '';

  return truncateForTts([meta, body].filter(Boolean).join('.\n\n'));
}

async function generateAudioForSource(source: NarrationSource): Promise<ArtworkAudio | null> {
  const text = buildNarrationTextFromSource(source);
  if (!text) return null;

  const config = readTtsConfig();
  if (!config) return null;

  assertSafeBackendUrl(config.baseUrl);

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/audio/speech`, {
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

    if (!response.ok) {
      const message = await response.text().catch(() => 'TTS request failed');
      throw new Error(`TTS request failed (${response.status}): ${message}`);
    }

    const contentType = response.headers.get('content-type') || `audio/${config.format}`;
    const audio = await response.blob();
    const file = await store.putFile(`gallery/audio/${source.id}-${Date.now()}.${config.format}`, audio, contentType);

    return {
      url: file.url,
      generatedAt: new Date().toISOString(),
      voice: config.voice,
    };
  } finally {
    clearTimeout(timeout);
  }
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

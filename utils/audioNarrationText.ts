export interface NarrationSource {
  id?: string;
  title: string;
  artist: string;
  year?: string;
  date?: string;
  medium?: string;
  shortDescription?: string;
  statement?: string;
  longDescription?: string;
}

const MAX_TTS_INPUT_CHARS = 4096;

function truncateForTts(text: string): string {
  if (text.length <= MAX_TTS_INPUT_CHARS) return text;
  return `${text.slice(0, MAX_TTS_INPUT_CHARS - 1).trimEnd()}.`;
}

export function buildNarrationTextFromSource(source: NarrationSource): string {
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

export function audioTextSignature(source: NarrationSource): string {
  const text = buildNarrationTextFromSource(source).replace(/\s+/g, ' ').trim();
  let hash = 2166136261;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

import { NextRequest, NextResponse } from 'next/server';
import { store } from '../../../lib/blobStore';
import { saveSubmission, getSettings, Submission } from '../../../lib/storage';
import { notifyModerators } from '../../../lib/email';
import { normalizeContentNotes } from '../../../config/contentNotes';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
};

function parseContentNotes(value: string): string[] {
  try {
    return normalizeContentNotes(JSON.parse(value));
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const title = (form.get('title') as string)?.trim();
    const artist = (form.get('artist') as string)?.trim();
    const email = (form.get('email') as string)?.trim();
    const medium = (form.get('medium') as string | null)?.trim() ?? '';
    const year = (form.get('year') as string | null)?.trim() ?? '';
    const shortDescription = (form.get('shortDescription') as string | null)?.trim() ?? '';
    const statement = (form.get('statement') as string | null)?.trim() ?? '';
    const contentNotesRaw = (form.get('contentNotes') as string | null) ?? '[]';
    const contentNotes = parseContentNotes(contentNotesRaw);
    const preferredRoom = (form.get('preferredRoom') as string | null)?.trim() ?? '';
    const preferredSlotRaw = parseInt((form.get('preferredSlot') as string | null) ?? '', 10);
    const preferredSlot = Number.isInteger(preferredSlotRaw) && preferredSlotRaw >= 0 ? preferredSlotRaw : undefined;
    const aspectRatio = parseFloat((form.get('aspectRatio') as string) ?? '1');
    const file = form.get('file') as File | null;
    const artistAudio = form.get('artistAudio') as File | null;
    const audioDurationRaw = Number(form.get('artistAudioDuration'));
    const artistAudioDurationSec = Number.isFinite(audioDurationRaw) && audioDurationRaw > 0
      ? audioDurationRaw
      : undefined;

    if (!title || !artist || !email || !shortDescription || !file) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File must be JPG, PNG or WEBP.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be under 5 MB.' }, { status: 400 });
    }
    if (artistAudio && artistAudio.size > 0) {
      if (!AUDIO_TYPES[artistAudio.type]) {
        return NextResponse.json({ error: 'Audio must be MP3, WAV, M4A, AAC or OGG.' }, { status: 400 });
      }
      if (artistAudio.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'Audio must be under 10 MB.' }, { status: 400 });
      }
    }

    const id = crypto.randomUUID();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const blob = await store.putFile(`submissions/${id}.${ext}`, file, file.type);
    const artistAudioBlob = artistAudio && artistAudio.size > 0
      ? await store.putFile(
        `submissions/${id}-audio.${AUDIO_TYPES[artistAudio.type]}`,
        artistAudio,
        artistAudio.type,
      )
      : null;

    const submission: Submission = {
      id,
      title,
      artist,
      email,
      medium,
      year,
      shortDescription,
      statement,
      contentNotes: contentNotes.length > 0 ? contentNotes : undefined,
      imageUrl: blob.url,
      aspectRatio: isFinite(aspectRatio) ? aspectRatio : 1,
      artistAudioUrl: artistAudioBlob?.url,
      artistAudioDurationSec,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      preferredRoom: preferredRoom || undefined,
      preferredSlot,
    };

    await saveSubmission(submission);

    // The submission is saved; a failed moderator notification must not tell the
    // artist their upload failed and prompt them to send it again.
    try {
      const origin = request.headers.get('origin') ?? '';
      const settings = await getSettings();
      await notifyModerators(settings, { artist, title, adminUrl: `${origin}/admin` });
    } catch (err) {
      console.error('[submit] saved but moderator notification failed:', err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[submit]', err);
    return NextResponse.json({ error: 'Submission failed. Please try again.' }, { status: 500 });
  }
}

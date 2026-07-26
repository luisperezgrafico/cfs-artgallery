import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { saveSubmission } from '../../../lib/storage';
import { getSettings, Submission } from '../../../lib/storage';
import { notifyModerators } from '../../../lib/email';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const title = (form.get('title') as string)?.trim();
    const artist = (form.get('artist') as string)?.trim();
    const email = (form.get('email') as string)?.trim();
    const medium = (form.get('medium') as string | null)?.trim() ?? '';
    const year = (form.get('year') as string | null)?.trim() ?? '';
    const statement = (form.get('statement') as string | null)?.trim() ?? '';
    const aspectRatio = parseFloat((form.get('aspectRatio') as string) ?? '1');
    const file = form.get('file') as File | null;

    if (!title || !artist || !email || !file) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File must be JPG, PNG or WEBP.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be under 5 MB.' }, { status: 400 });
    }

    const id = nanoid();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const blob = await put(`submissions/${id}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
    });

    const submission: Submission = {
      id,
      title,
      artist,
      email,
      medium,
      year,
      statement,
      imageUrl: blob.url,
      aspectRatio: isFinite(aspectRatio) ? aspectRatio : 1,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    await saveSubmission(submission);

    const origin = request.headers.get('origin') ?? '';
    const settings = await getSettings();
    await notifyModerators(settings, {
      artist,
      title,
      adminUrl: `${origin}/admin`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[submit]', err);
    return NextResponse.json({ error: 'Submission failed. Please try again.' }, { status: 500 });
  }
}

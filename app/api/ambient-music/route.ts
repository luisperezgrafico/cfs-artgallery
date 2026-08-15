import { NextResponse } from 'next/server';
import { DEFAULT_AMBIENT_MUSIC } from '../../../config/ambientMusic';
import { getSettings } from '../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json((await getSettings()).ambientMusic);
  } catch {
    return NextResponse.json(DEFAULT_AMBIENT_MUSIC);
  }
}

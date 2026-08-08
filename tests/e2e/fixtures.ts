import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { Submission } from '../../lib/storage';
import type { ImageMetadata } from '../../types/museum';

/** A 1×1 transparent PNG — enough for an upload without shipping a binary fixture. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export function submission(id: string, overrides: Partial<Submission> = {}): Submission {
  return {
    id,
    title: `Piece ${id}`,
    artist: `Artist ${id}`,
    email: `${id}@example.test`,
    medium: 'Watercolour on paper',
    year: '2026',
    shortDescription: `A short note about ${id}.`,
    statement: '',
    imageUrl: '/art/placeholder-horizon.svg',
    aspectRatio: 1,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

export function artwork(id: string, overrides: Partial<ImageMetadata> = {}): ImageMetadata {
  return {
    id,
    url: '/art/placeholder-horizon.svg',
    title: `Piece ${id}`,
    artist: `Artist ${id}`,
    date: '2026',
    link: '',
    ...overrides,
  };
}

/** Wipes the in-memory store and seeds it. Only works with GALLERY_STORAGE=memory. */
export async function seed(
  request: APIRequestContext,
  data: { submissions?: Submission[]; artworks?: Record<string, ImageMetadata[]> } = {},
): Promise<void> {
  const res = await request.post('/api/testing/reset', { data });
  expect(res.ok(), 'test reset endpoint should be available (GALLERY_STORAGE=memory)').toBe(true);
}

/** Opens the admin panel and waits for the first load to settle. */
export async function openAdmin(page: Page): Promise<void> {
  await page.goto('/admin');
  await expect(page.getByTestId('admin-main')).toHaveAttribute('data-loading', 'false');
}

export const card = (page: Page, id: string) => page.locator(`[data-submission-id="${id}"]`);
export const row = (page: Page, id: string) => page.locator(`[data-artwork-id="${id}"]`);

/**
 * Deletes an approved artwork and waits for the server to acknowledge it.
 *
 * The row disappears optimistically, so asserting on stored state right after
 * the click would race the request that is still in flight.
 */
export async function deleteArtwork(page: Page, id: string): Promise<void> {
  const responded = page.waitForResponse(r =>
    r.request().method() === 'DELETE' && r.url().includes('/api/admin/artworks/'));
  await row(page, id).getByTestId('delete-button').click();
  await page.getByTestId('confirm-delete').click();
  await responded;
}

/** Runs `action`, then waits for `assertion`, returning how long that took in ms. */
export async function timeUntil(action: () => Promise<void>, assertion: () => Promise<void>): Promise<number> {
  const started = Date.now();
  await action();
  await assertion();
  return Date.now() - started;
}

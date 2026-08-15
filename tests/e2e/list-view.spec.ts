import { test, expect } from '@playwright/test';
import { seed, artwork, tinyWav } from './fixtures';

const audioDataUri = tinyWav(1).toString('base64');
const AUDIO_A = `data:audio/wav;base64,${audioDataUri}`;

/**
 * The list view (/list) is the low-cost alternative to the 3D gallery: a
 * Server Component reading the same room/artwork catalog, with no Three.js.
 */

test.describe('list view', () => {
  test('shows the static catalog by default', async ({ page, request }) => {
    await seed(request);
    await page.goto('/list');
    await expect(page.getByRole('heading', { name: 'Lux Perpetua' })).toBeVisible();
  });

  test('live submissions in a room replace its static placeholders', async ({ page, request }) => {
    await seed(request, {
      artworks: { 'room-1': [artwork('a', { title: 'Piece A', shortDescription: 'A short note.' })] },
    });
    await page.goto('/list');

    await expect(page.getByRole('heading', { name: 'Piece A' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lux Perpetua' })).toHaveCount(0);
  });

  test('"View in the 3D gallery" jumps straight into the scene at that artwork', async ({ page, request }) => {
    await seed(request, {
      artworks: { 'room-1': [artwork('a', { title: 'Piece A' })] },
    });
    await page.goto('/list');
    await page.getByRole('link', { name: 'View in the 3D gallery' }).click();

    // Full scene load (title screen -> 3D assets) takes several seconds even in
    // test conditions, so assert the door was bypassed rather than waiting for it.
    await expect(page).toHaveURL(/room=room-1&frame=0/);
    await expect(page.getByRole('button', { name: 'Enter the gallery' })).toHaveCount(0);
  });

  test('the zoom button opens the full-size lightbox', async ({ page, request }) => {
    await seed(request, {
      artworks: { 'room-1': [artwork('a', { title: 'Piece A' })] },
    });
    await page.goto('/list');

    await page.getByRole('button', { name: 'View full image of Piece A' }).click();
    await expect(page.getByRole('img', { name: 'Piece A' })).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('img', { name: 'Piece A' })).toHaveCount(0);
  });

  test('"Submit your artwork" opens the same submission modal as the 3D gallery', async ({ page, request }) => {
    await seed(request, {
      artworks: { 'room-1': [artwork('a', { title: 'Piece A' })] },
    });
    await page.goto('/list');

    await page.getByRole('button', { name: 'Submit your artwork' }).click();
    await expect(page.getByRole('heading', { name: 'Submit your artwork' })).toBeVisible();

    await page.getByLabel('Close').click();
    await expect(page.getByRole('heading', { name: 'Submit your artwork' })).toHaveCount(0);
  });

  test('"Next artwork" eventually lands on the submit CTA as the final stop', async ({ page, request }) => {
    await seed(request, {
      artworks: { 'room-1': [artwork('a', { title: 'Piece A' })] },
    });
    await page.goto('/list');

    const next = page.getByRole('button', { name: 'Next artwork' });
    await next.click();
    await next.click();

    await expect(page.getByRole('button', { name: 'Submit your artwork' })).toBeInViewport();
  });

  test('playing one artwork\'s audio pauses another that was already playing', async ({ page, request }) => {
    await seed(request, {
      artworks: {
        'room-1': [
          artwork('a', { title: 'Piece A', audioUrl: AUDIO_A }),
          artwork('b', { title: 'Piece B', audioUrl: AUDIO_A }),
        ],
      },
    });
    await page.goto('/list');

    const players = page.locator('.list-view-item-audio');
    await expect(players).toHaveCount(2);

    await players.nth(0).evaluate((el: HTMLAudioElement) => el.play());
    await expect.poll(() => players.nth(0).evaluate((el: HTMLAudioElement) => !el.paused)).toBe(true);

    await players.nth(1).evaluate((el: HTMLAudioElement) => el.play());
    await expect.poll(() => players.nth(1).evaluate((el: HTMLAudioElement) => !el.paused)).toBe(true);
    await expect.poll(() => players.nth(0).evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  });

  test('the door links to the list view', async ({ page, request }) => {
    await seed(request);
    await page.goto('/');
    await page.getByRole('link', { name: 'Simple list view' }).click();

    await expect(page).toHaveURL(/\/list$/);
    await expect(page.getByRole('heading', { name: 'Lux Perpetua' })).toBeVisible();
  });
});

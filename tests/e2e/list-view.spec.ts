import { test, expect } from '@playwright/test';
import { seed, artwork } from './fixtures';

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

  test('the door links to the list view', async ({ page, request }) => {
    await seed(request);
    await page.goto('/');
    await page.getByRole('link', { name: 'Simple list view' }).click();

    await expect(page).toHaveURL(/\/list$/);
    await expect(page.getByRole('heading', { name: 'Lux Perpetua' })).toBeVisible();
  });
});

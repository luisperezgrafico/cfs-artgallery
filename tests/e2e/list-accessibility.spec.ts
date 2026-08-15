import { test, expect } from '@playwright/test';
import { artwork, seed } from './fixtures';

test.describe('list view accessibility', () => {
  test('names media and keeps keyboard focus inside the lightbox', async ({ page, request }) => {
    await seed(request, {
      artworks: {
        'room-1': [artwork('static-lux-perpetua', {
          title: 'Lux Perpetua',
          artist: 'Mira Solenne',
          altText: 'A pale abstract landscape with a soft circular glow above a muted horizon.',
          audioUrl: 'https://example.test/lux-perpetua.mp3',
        })],
      },
    });
    await page.goto('/list');

    await expect(page.locator('img').first()).toHaveAttribute(
      'alt',
      'A pale abstract landscape with a soft circular glow above a muted horizon.',
    );
    await expect(page.locator('audio').first()).toHaveAttribute(
      'aria-label',
      'Listen to narration for Lux Perpetua, by Mira Solenne',
    );
    await expect(page.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#list-view-top');

    const open = page.getByRole('button', { name: 'View full image of Lux Perpetua' });
    await open.click();

    await expect(page.getByRole('dialog').getByRole('img')).toHaveAccessibleName(
      'A pale abstract landscape with a soft circular glow above a muted horizon.',
    );
    const close = page.getByRole('button', { name: 'Close' });
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(zoomIn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await zoomIn.click();
    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(open).toBeFocused();
  });
});

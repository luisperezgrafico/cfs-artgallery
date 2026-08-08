import { test, expect } from '@playwright/test';
import { seed, openAdmin, submission, artwork, card, row, deleteArtwork, timeUntil, TINY_PNG } from './fixtures';

/**
 * End-to-end coverage of the moderation loop: a card appears, moves between
 * tabs when approved, and disappears when deleted — and stays that way.
 *
 * Several of these encode past regressions; the comments say which.
 */

test.describe('submissions queue', () => {
  test('lists pending submissions and nothing else', async ({ page, request }) => {
    await seed(request, {
      submissions: [
        submission('a'),
        submission('b'),
        submission('done', { status: 'approved' }),
      ],
    });
    await openAdmin(page);

    await expect(page.getByTestId('submission-card')).toHaveCount(2);
    await expect(card(page, 'a')).toBeVisible();
    await expect(card(page, 'done')).toHaveCount(0);
    await expect(page.getByTestId('count-submissions')).toHaveText('2');
  });

  test('shows the empty state with nothing to moderate', async ({ page, request }) => {
    await seed(request);
    await openAdmin(page);
    await expect(page.getByTestId('submissions-empty')).toBeVisible();
  });
});

test.describe('approving', () => {
  test('moves the card out of the queue and into the assigned room', async ({ page, request }) => {
    await seed(request, { submissions: [submission('a'), submission('b')] });
    await openAdmin(page);

    const elapsed = await timeUntil(
      async () => {
        await card(page, 'a').getByTestId('approve-button').click();
        await page.getByLabel('Assign to room').selectOption('room-2');
        await page.getByTestId('confirm-approve').click();
      },
      async () => {
        // Approving jumps to the Approved tab, where the piece is now hanging.
        await expect(row(page, 'a')).toBeVisible();
      },
    );

    // Generous, but it catches a hang or a full page reload sneaking back in.
    expect(elapsed, `approval took ${elapsed}ms`).toBeLessThan(5000);
    console.log(`[timing] approve → row visible in Approved: ${elapsed}ms`);

    await expect(page.locator('[data-room-id="room-2"]').locator('[data-artwork-id="a"]')).toBeVisible();

    await page.getByTestId('tab-submissions').click();
    await expect(card(page, 'a')).toHaveCount(0);
    await expect(card(page, 'b')).toBeVisible();
  });

  test('the approved card does not come back when you revisit the tab', async ({ page, request }) => {
    // Regression: submissions state lived inside the tab, so switching away threw
    // the optimistic result away and the next mount re-read a stale list.
    await seed(request, { submissions: [submission('a')] });
    await openAdmin(page);

    await card(page, 'a').getByTestId('approve-button').click();
    await page.getByTestId('confirm-approve').click();
    await expect(row(page, 'a')).toBeVisible();

    for (let i = 0; i < 3; i++) {
      await page.getByTestId('tab-submissions').click();
      await expect(page.getByTestId('submissions-empty')).toBeVisible();
      await page.getByTestId('tab-approved').click();
      await expect(row(page, 'a')).toBeVisible();
    }
  });

  test('survives an explicit refresh and a full page reload', async ({ page, request }) => {
    await seed(request, { submissions: [submission('a')] });
    await openAdmin(page);

    await card(page, 'a').getByTestId('approve-button').click();
    await page.getByTestId('confirm-approve').click();
    await expect(row(page, 'a')).toBeVisible();

    await page.getByTestId('refresh').click();
    await expect(page.getByTestId('admin-main')).toHaveAttribute('data-loading', 'false');
    await expect(row(page, 'a')).toBeVisible();

    await openAdmin(page);
    await expect(page.getByTestId('submissions-empty')).toBeVisible();
    await page.getByTestId('tab-approved').click();
    await expect(row(page, 'a')).toBeVisible();
  });

  test('a second approval of the same piece is refused, not duplicated', async ({ page, request }) => {
    await seed(request, { submissions: [submission('a')] });
    await openAdmin(page);

    await card(page, 'a').getByTestId('approve-button').click();
    await page.getByTestId('confirm-approve').click();
    await expect(row(page, 'a')).toBeVisible();

    // Replay the approval straight at the API, as a double click or a retry would.
    const res = await page.request.post('/api/admin/submissions/a/approve', { data: { roomId: 'room-1' } });
    expect(res.status()).toBe(409);

    await page.getByTestId('refresh').click();
    await expect(page.getByTestId('admin-main')).toHaveAttribute('data-loading', 'false');
    await expect(row(page, 'a')).toHaveCount(1);
  });

  test('reports the error and keeps the card when approval fails', async ({ page, request }) => {
    await seed(request, { submissions: [submission('a')] });
    await openAdmin(page);

    await page.route('**/api/admin/submissions/*/approve', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Blob is down.' }) }));

    await card(page, 'a').getByTestId('approve-button').click();
    await page.getByTestId('confirm-approve').click();

    await expect(page.getByTestId('approve-error')).toContainText('Blob is down.');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(card(page, 'a')).toBeVisible();
  });
});

test.describe('rejecting', () => {
  test('removes the card and does not hang the artwork anywhere', async ({ page, request }) => {
    await seed(request, { submissions: [submission('a'), submission('b')] });
    await openAdmin(page);

    const elapsed = await timeUntil(
      async () => {
        await card(page, 'a').getByTestId('reject-button').click();
        await page.getByLabel('Note to the artist').fill('Not this time, but please send more.');
        await page.getByTestId('confirm-reject').click();
      },
      async () => { await expect(card(page, 'a')).toHaveCount(0); },
    );
    console.log(`[timing] reject → card gone: ${elapsed}ms`);
    expect(elapsed, `rejection took ${elapsed}ms`).toBeLessThan(5000);

    await expect(card(page, 'b')).toBeVisible();
    await page.getByTestId('tab-approved').click();
    await expect(page.getByTestId('approved-empty')).toBeVisible();
  });

  test('the rejected card does not come back on refresh', async ({ page, request }) => {
    await seed(request, { submissions: [submission('a')] });
    await openAdmin(page);

    await card(page, 'a').getByTestId('reject-button').click();
    await page.getByTestId('confirm-reject').click();
    await expect(page.getByTestId('submissions-empty')).toBeVisible();

    await page.getByTestId('refresh').click();
    await expect(page.getByTestId('admin-main')).toHaveAttribute('data-loading', 'false');
    await expect(page.getByTestId('submissions-empty')).toBeVisible();
  });
});

test.describe('deleting an approved artwork', () => {
  test.beforeEach(async ({ request }) => {
    await seed(request, {
      artworks: { 'room-1': [artwork('x'), artwork('y'), artwork('z')] },
    });
  });

  test('removes the piece the moderator picked, not the one at that index', async ({ page }) => {
    // Regression: deletion used the array position from a client snapshot, so a
    // divergence deleted a different artwork than the one on screen.
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();

    const elapsed = await timeUntil(
      async () => {
        await row(page, 'y').getByTestId('delete-button').click();
        await page.getByTestId('confirm-delete').click();
      },
      async () => { await expect(row(page, 'y')).toHaveCount(0); },
    );
    console.log(`[timing] delete → row gone: ${elapsed}ms`);
    expect(elapsed, `deletion took ${elapsed}ms`).toBeLessThan(5000);

    await expect(row(page, 'x')).toBeVisible();
    await expect(row(page, 'z')).toBeVisible();

    // A reload drops every local guard, so this asserts what the server stored.
    await page.waitForResponse(r => r.request().method() === 'DELETE');
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();
    await expect(page.getByTestId('artwork-row')).toHaveCount(2);
    await expect(row(page, 'y')).toHaveCount(0);
  });

  test('deleted pieces stay gone across tab switches', async ({ page }) => {
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();
    await row(page, 'x').getByTestId('delete-button').click();
    await page.getByTestId('confirm-delete').click();
    await expect(row(page, 'x')).toHaveCount(0);

    await page.getByTestId('tab-submissions').click();
    await page.getByTestId('tab-approved').click();
    await expect(row(page, 'x')).toHaveCount(0);

    await page.getByTestId('refresh').click();
    await expect(page.getByTestId('admin-main')).toHaveAttribute('data-loading', 'false');
    await expect(row(page, 'x')).toHaveCount(0);
  });

  test('puts the row back with a visible reason when the delete fails', async ({ page }) => {
    // Regression: the confirm modal closed before the error rendered, so a failed
    // delete rolled back silently and the artwork just reappeared.
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();

    await page.route('**/api/admin/artworks/*', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Storage unavailable.' }) }));

    await row(page, 'x').getByTestId('delete-button').click();
    await page.getByTestId('confirm-delete').click();

    await expect(page.getByTestId('approved-error')).toContainText('Storage unavailable.');
    await expect(row(page, 'x')).toBeVisible();
    await expect(page.getByTestId('artwork-row')).toHaveCount(3);
  });

  test('removing everything falls back to the empty state', async ({ page }) => {
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();

    for (const id of ['x', 'y', 'z']) {
      await row(page, id).getByTestId('delete-button').click();
      await page.getByTestId('confirm-delete').click();
      await expect(row(page, id)).toHaveCount(0);
    }
    await expect(page.getByTestId('approved-empty')).toBeVisible();
  });
});

test.describe('the whole loop', () => {
  test('an uploaded artwork reaches the queue, the gallery, and then leaves', async ({ page, request }) => {
    await seed(request);

    const res = await request.post('/api/submit', {
      multipart: {
        title: 'Morning light',
        artist: 'Ada',
        email: 'ada@example.test',
        medium: 'Ink',
        year: '2026',
        shortDescription: 'Made on a good day.',
        statement: 'A longer note about the piece.',
        preferredRoom: 'room-3',
        aspectRatio: '1',
        file: { name: 'morning.png', mimeType: 'image/png', buffer: TINY_PNG },
      },
    });
    expect(res.ok()).toBe(true);

    await openAdmin(page);
    const uploaded = page.getByTestId('submission-card').filter({ hasText: 'Morning light' });
    await expect(uploaded).toBeVisible();
    await expect(uploaded).toContainText('Ada');

    // The room select should default to the room the artist was standing in.
    await uploaded.getByTestId('approve-button').click();
    await expect(page.getByLabel('Assign to room')).toHaveValue('room-3');
    await page.getByTestId('confirm-approve').click();

    const hung = page.locator('[data-room-id="room-3"]').getByTestId('artwork-row');
    await expect(hung).toContainText('Morning light');

    // And the public gallery serves it.
    const publicArtworks = await request.get('/api/artworks');
    const byRoom = await publicArtworks.json() as Record<string, Array<{ title: string }>>;
    expect(byRoom['room-3'].map(a => a.title)).toContain('Morning light');

    const uploadedId = await hung.getAttribute('data-artwork-id');
    await deleteArtwork(page, uploadedId!);
    await expect(page.getByTestId('approved-empty')).toBeVisible();

    const afterDelete = await (await request.get('/api/artworks')).json() as Record<string, unknown[]>;
    expect(afterDelete['room-3']).toEqual([]);
  });
});

test.describe('the publishing gap', () => {
  /**
   * Storage is eventually consistent: for a while after an approval, a read still
   * returns the room without the new piece. The memory store used by these tests
   * has no such lag, so we impose it — the artworks endpoint is rewritten to
   * report an empty room plus a `publishing` entry, exactly what the real backend
   * sends during the gap.
   */
  async function withLaggingStorage(page: import('@playwright/test').Page, submissionId: string) {
    await page.route('**/api/admin/artworks', async route => {
      const response = await route.fetch();
      const body = await response.json() as {
        artworks: Record<string, unknown[]>;
        publishing: unknown[];
      };
      const stale = Object.fromEntries(Object.keys(body.artworks).map(id => [id, []]));
      await route.fulfill({
        json: {
          artworks: stale,
          publishing: [{ id: submissionId, title: `Piece ${submissionId}`, artist: `Artist ${submissionId}`, imageUrl: '/art/drawing-1.svg', approvedRoom: 'room-1' }],
        },
      });
    });
  }

  test('shows an approved piece as publishing instead of losing it', async ({ page, request }) => {
    await seed(request, { submissions: [submission('a')] });
    await openAdmin(page);

    await withLaggingStorage(page, 'a');
    await card(page, 'a').getByTestId('approve-button').click();
    await page.getByTestId('confirm-approve').click();

    // The row is there straight away, marked as still going out.
    await expect(row(page, 'a')).toBeVisible();
    await expect(page.getByTestId('publishing-chip').first()).toBeVisible();
    await expect(page.getByTestId('publishing-banner')).toContainText('still');
  });

  test('the chip clears on its own once storage catches up', async ({ page, request }) => {
    await seed(request, { submissions: [submission('a')] });
    await openAdmin(page);

    await withLaggingStorage(page, 'a');
    await card(page, 'a').getByTestId('approve-button').click();
    await page.getByTestId('confirm-approve').click();
    await expect(page.getByTestId('publishing-chip').first()).toBeVisible();

    // Storage catches up: stop rewriting the response and let the poll notice.
    await page.unroute('**/api/admin/artworks');

    const elapsed = await timeUntil(
      async () => {},
      async () => { await expect(page.getByTestId('publishing-chip')).toHaveCount(0); },
    );
    console.log(`[timing] publishing chip cleared by polling: ${elapsed}ms`);
    await expect(page.getByTestId('publishing-banner')).toHaveCount(0);
    await expect(row(page, 'a')).toBeVisible();
  });

  test('after a reload the server still accounts for the piece', async ({ page, request }) => {
    // The browser has no memory of the approval here — this is entirely the
    // server telling the panel that something is on its way.
    await seed(request, { submissions: [submission('a')] });
    await openAdmin(page);
    await card(page, 'a').getByTestId('approve-button').click();
    await page.getByTestId('confirm-approve').click();
    await expect(row(page, 'a')).toBeVisible();

    await withLaggingStorage(page, 'a');
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();

    await expect(page.getByTestId('publishing-row')).toHaveCount(1);
    await expect(page.getByTestId('publishing-row')).toContainText('Piece a');
    await expect(page.getByTestId('approved-empty')).toHaveCount(0);
  });
});

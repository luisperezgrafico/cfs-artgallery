import { test, expect } from '@playwright/test';
import { seed, openAdmin, submission, artwork, card, row, deleteArtwork, timeUntil, TINY_PNG } from './fixtures';
import { BASE_URL, TEST_ADMIN } from '../../playwright.config';
import { audioTextSignature } from '../../utils/audioNarrationText';

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

  test('shows artist room and slot preferences when approving', async ({ page, request }) => {
    await seed(request, {
      submissions: [submission('a', { preferredRoom: 'room-2', preferredSlot: 3, contentNotes: ['dark-imagery'] })],
      artworks: { 'room-2': [artwork('taken', { slot: 0 })] },
    });
    await openAdmin(page);

    await card(page, 'a').getByTestId('approve-button').click();
    await expect(page.getByText('Artist preference: Room II · slot 4')).toBeVisible();
    await expect(page.getByText('Dark imagery')).toBeVisible();
    await expect(page.getByLabel('Assign to room')).toHaveValue('room-2');
    await expect(page.getByLabel('Assign to slot')).toHaveValue('3');
    await expect(page.getByLabel('Assign to slot').locator('option[value="0"]')).toBeDisabled();

    await page.getByTestId('confirm-approve').click();
    const approved = page.locator('[data-room-id="room-2"]').locator('[data-artwork-id="a"]');
    await expect(approved).toBeVisible();
    await expect(approved).toContainText('slot 4');
    const publicArtworks = await request.get('/api/artworks');
    const byRoom = await publicArtworks.json() as Record<string, Array<{ id?: string; contentNotes?: string[] }>>;
    expect(byRoom['room-2']?.find(item => item.id === 'a')?.contentNotes).toEqual(['dark-imagery']);
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
        await deleteArtwork(page, 'y');
      },
      async () => { await expect(row(page, 'y')).toHaveCount(0); },
    );
    console.log(`[timing] delete → row gone: ${elapsed}ms`);
    expect(elapsed, `deletion took ${elapsed}ms`).toBeLessThan(5000);

    await expect(row(page, 'x')).toBeVisible();
    await expect(row(page, 'z')).toBeVisible();

    // A reload drops every local guard, so this asserts what the server stored.
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();
    await expect(page.getByTestId('artwork-row')).toHaveCount(2);
    await expect(row(page, 'y')).toHaveCount(0);
  });

  test('deleted pieces stay gone across tab switches', async ({ page }) => {
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();
    await deleteArtwork(page, 'x');
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

    await row(page, 'x').getByTestId('manage-button').click();
    await page.getByTestId('delete-button').click();
    await page.getByTestId('confirm-delete').click();

    await expect(page.getByTestId('approved-error')).toContainText('Storage unavailable.');
    await expect(row(page, 'x')).toBeVisible();
    await expect(page.getByTestId('artwork-row')).toHaveCount(3);
  });

  test('removing everything falls back to the empty state', async ({ page }) => {
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();

    for (const id of ['x', 'y', 'z']) {
      await deleteArtwork(page, id);
      await expect(row(page, id)).toHaveCount(0);
    }
    await expect(page.getByTestId('approved-empty')).toBeVisible();
  });
});

test.describe('managing an approved artwork', () => {
  test('lists approved artworks in slot order and disables occupied slots', async ({ page, request }) => {
    await seed(request, {
      artworks: {
        'room-1': [
          artwork('free', { title: 'Free placement' }),
          artwork('slot-3', { title: 'Slot three', slot: 2, shortDescription: 'Needs audio.' }),
          artwork('slot-1', {
            title: 'Slot one',
            slot: 0,
            shortDescription: 'Current text.',
            audioUrl: '/audio/ready.mp3',
            audioTextSignature: audioTextSignature(artwork('slot-1', {
              title: 'Slot one',
              shortDescription: 'Previous text.',
            })),
          }),
        ],
        'room-2': [
          artwork('taken', { title: 'Taken slot', slot: 3 }),
        ],
      },
    });
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();

    const roomOneTitles = await page
      .locator('[data-room-id="room-1"] [data-testid="artwork-row"]')
      .locator('p.text-white')
      .allTextContents();
    expect(roomOneTitles).toEqual(['Slot one', 'Slot three', 'Free placement']);
    await expect(row(page, 'slot-1').getByTestId('audio-status')).toContainText('Audio outdated');
    await expect(row(page, 'slot-3').getByTestId('audio-status')).toContainText('Audio missing');
    await expect(row(page, 'free').getByTestId('audio-status')).toContainText('Audio missing');

    await row(page, 'slot-1').getByTestId('manage-button').click();
    await page.getByLabel('Room').selectOption('room-2');
    await expect(page.getByLabel('Slot').locator('option[value="3"]')).toBeDisabled();
  });

  test('edits metadata and moves the artwork to another room and slot', async ({ page, request }) => {
    await seed(request, {
      artworks: {
        'room-1': [
          artwork('x', {
            title: 'Original title',
            shortDescription: 'Original short description.',
            longDescription: 'Original long description.',
          }),
        ],
      },
    });
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();

    await row(page, 'x').getByTestId('manage-button').click();
    await page.getByLabel('Artwork title').fill('Edited title');
    await page.getByLabel('Short description').fill('Edited short description.');
    await page.getByLabel('Room').selectOption('room-2');
    await page.getByLabel('Slot').selectOption('3');

    const updated = page.waitForResponse(r =>
      r.request().method() === 'PATCH' && r.url().includes('/api/admin/artworks/room-1'));
    await page.getByTestId('save-artwork').click();
    await updated;
    await expect(page.getByText('Saved')).toBeVisible();

    await page.getByLabel('Close').click();
    await expect(page.locator('[data-room-id="room-1"]').locator('[data-artwork-id="x"]')).toHaveCount(0);
    const moved = page.locator('[data-room-id="room-2"]').locator('[data-artwork-id="x"]');
    await expect(moved).toBeVisible();
    await expect(moved).toContainText('Edited title');
    await expect(moved).toContainText('slot 4');
  });

  test('uploads artist audio from the manage modal', async ({ page, request }) => {
    await seed(request, {
      artworks: {
        'room-1': [
          artwork('x', {
            title: 'Original title',
            shortDescription: 'Original short description.',
          }),
        ],
      },
    });
    await openAdmin(page);
    await page.getByTestId('tab-approved').click();

    await row(page, 'x').getByTestId('manage-button').click();
    const uploaded = page.waitForResponse(r =>
      r.request().method() === 'POST' && r.url().includes('/api/admin/artworks/room-1/audio/upload'));
    await page.getByTestId('upload-audio-input').setInputFiles({
      name: 'artist-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from([1, 2, 3, 4]),
    });
    await uploaded;

    await expect(page.getByText('Uploaded just now')).toBeVisible();
    const removed = page.waitForResponse(r =>
      r.request().method() === 'DELETE' && r.url().includes('/api/admin/artworks/room-1/audio'));
    await page.getByTestId('remove-audio').click();
    await removed;
    await expect(page.getByText('Audio is missing for this artwork.')).toBeVisible();

    await page.getByLabel('Close').click();
    await expect(row(page, 'x').getByTestId('audio-status')).toContainText('Audio missing');
  });
});

test.describe('developer tools', () => {
  test('are hidden and forbidden for the regular admin user', async ({ page, request }) => {
    await seed(request);
    await openAdmin(page);

    await expect(page.getByTestId('tab-developer')).toHaveCount(0);
    const res = await request.post('/api/admin/developer/reset-room-1');
    expect(res.status()).toBe(403);
    const audioRes = await request.get('/api/admin/developer/audio-settings');
    expect(audioRes.status()).toBe(403);
  });

  test('resets Room I with the template artworks for the dev user', async ({ browser, request }) => {
    await seed(request, {
      artworks: { 'room-1': [artwork('custom', { title: 'Custom artwork' })] },
    });
    const context = await browser.newContext({
      baseURL: BASE_URL,
      httpCredentials: { username: 'dev', password: TEST_ADMIN.password },
    });
    const page = await context.newPage();

    await openAdmin(page);
    await page.getByTestId('tab-approved').click();
    await expect(row(page, 'custom')).toBeVisible();

    await page.getByTestId('tab-settings').click();
    await page.getByRole('button', { name: /ElevenLabs audio/i }).click();
    await page.getByPlaceholder('Paste ElevenLabs API key').fill('eleven-test-key');
    await page.locator('select').selectOption('JBFqnCBsd6RMkjVDRZzb');
    const audioSave = page.waitForResponse(r =>
      r.request().method() === 'PUT' && r.url().includes('/api/admin/settings/audio'));
    await page.getByTestId('save-elevenlabs-settings').click();
    await audioSave;

    await page.getByTestId('tab-developer').click();
    await page.getByTestId('audio-provider').selectOption('elevenlabs');
    const providerSave = page.waitForResponse(r =>
      r.request().method() === 'PUT' && r.url().includes('/api/admin/developer/audio-settings'));
    await page.getByTestId('save-audio-settings').click();
    await providerSave;
    await expect(page.getByTestId('audio-settings-result')).toContainText('Audio settings saved');

    const reset = page.waitForResponse(r =>
      r.request().method() === 'POST' && r.url().includes('/api/admin/developer/reset-room-1'));
    await page.getByTestId('reset-room-1-seed').click();
    await reset;
    await expect(page.getByTestId('developer-result')).toContainText('Room I reset');

    await page.getByTestId('tab-approved').click();
    await expect(row(page, 'custom')).toHaveCount(0);
    await expect(row(page, 'static-lux-perpetua')).toBeVisible();
    await expect(row(page, 'static-hora-incerta')).toBeVisible();

    await context.close();
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
        contentNotes: JSON.stringify(['loss']),
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
    await expect(page.getByText('Loss')).toBeVisible();
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

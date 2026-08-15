import { Resend } from 'resend';
import { GallerySettings } from './storage';

type ResendSendResult = Awaited<ReturnType<Resend['emails']['send']>>;

function assertEmailAccepted(result: ResendSendResult): void {
  if (result.error) {
    throw new Error(result.error.message || 'Resend rejected the email.');
  }
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function sendArtistApproval(
  settings: GallerySettings,
  opts: { artist: string; title: string; email: string; galleryUrl: string },
): Promise<void> {
  const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[email skipped — no Resend API key] approval to:', opts.email);
    return;
  }

  const resend = new Resend(apiKey);
  const body = renderTemplate(settings.approvalTemplate, {
    artist: opts.artist,
    title: opts.title,
    gallery_url: opts.galleryUrl,
  });

  const result = await resend.emails.send({
    from: 'ME/CFS Gallery <gallery@notifications.cfs-gallery.art>',
    to: opts.email,
    subject: `Your artwork "${opts.title}" has been accepted`,
    text: body,
  });
  assertEmailAccepted(result);
}

export async function sendArtistRejection(
  settings: GallerySettings,
  opts: { artist: string; title: string; email: string; reason?: string },
): Promise<void> {
  const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[email skipped — no Resend API key] rejection to:', opts.email);
    return;
  }

  const resend = new Resend(apiKey);
  const baseBody = renderTemplate(settings.rejectionTemplate, {
    artist: opts.artist,
    title: opts.title,
  });
  const body = opts.reason ? `${baseBody}\n\nNote from the curators: ${opts.reason}` : baseBody;

  const result = await resend.emails.send({
    from: 'ME/CFS Gallery <gallery@notifications.cfs-gallery.art>',
    to: opts.email,
    subject: `Your submission "${opts.title}"`,
    text: body,
  });
  assertEmailAccepted(result);
}

export async function notifyModerators(
  settings: GallerySettings,
  opts: { artist: string; title: string; adminUrl: string },
): Promise<void> {
  const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY;
  const recipients = settings.testModeEnabled
    ? (settings.testModeRecipient ? [settings.testModeRecipient] : [])
    : settings.moderatorEmails;
  if (!apiKey || recipients.length === 0) {
    console.log('[email skipped] new submission by', opts.artist);
    return;
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: 'ME/CFS Gallery <gallery@notifications.cfs-gallery.art>',
    to: recipients,
    subject: `New artwork submission: "${opts.title}" by ${opts.artist}`,
    text: `A new artwork has been submitted to the gallery.\n\nTitle: ${opts.title}\nArtist: ${opts.artist}\n\nReview it at: ${opts.adminUrl}`,
  });
  assertEmailAccepted(result);
}

/** Sends a visitor's message to the configured moderator list. Unlike
 * submission notifications, this deliberately ignores test mode: feedback is
 * a direct message for the real moderation team. */
export async function sendGalleryFeedback(
  settings: GallerySettings,
  opts: { message: string; replyTo?: string },
): Promise<void> {
  const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY;
  if (!apiKey || settings.moderatorEmails.length === 0) {
    throw new Error('Feedback email is not configured.');
  }

  const result = await new Resend(apiKey).emails.send({
    from: 'ME/CFS Gallery <gallery@notifications.cfs-gallery.art>',
    to: settings.moderatorEmails,
    replyTo: opts.replyTo || undefined,
    subject: 'Gallery feedback',
    text: [
      'A visitor shared feedback with the gallery.',
      '',
      opts.message,
      ...(opts.replyTo ? ['', `Reply email: ${opts.replyTo}`] : []),
    ].join('\n'),
  });
  assertEmailAccepted(result);
}

#!/usr/bin/env node
/**
 * Mobile capture harness for the menu word ceding the top strip (390x844).
 * Run one state at a time: node /tmp/cfs-menu-capture.cjs A|B|C|D
 * Not repo code: a verification harness. See /tmp/cfs-menu-shots/report.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = '/home/luis/dev/repos/web/cfs-artgallery';
const BASE = process.env.GALLERY_BASE_URL || 'http://localhost:3002';
const OUT = process.env.CAPTURE_OUT_DIR || '/tmp/cfs-menu-shots';
const VIEWPORT = { width: 390, height: 844 };
const DPR = 2;
const POLL_MS = 300;
const STABLE_NEEDED = 3;
const BUDGET_MS = 60000;

const { chromium } = require(path.join(REPO, 'node_modules', 'playwright'));
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => { process.stdout.write(a.join(' ') + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function probe(args) {
  const classOf = (el) => (typeof el.className === 'string' ? el.className : '');
  const isVisible = (el) => {
    if (!el || !el.isConnected) return false;
    let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const op = parseFloat(cs.opacity);
      if (!Number.isNaN(op) && op <= 0.01) return false;
      node = node.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const byLabel = (label) => Array.from(document.querySelectorAll('[aria-label]'))
    .find((el) => el.getAttribute('aria-label') === label && isVisible(el));
  const byText = (text) => Array.from(document.querySelectorAll('button'))
    .find((b) => (b.textContent || '').trim() === text && isVisible(b));

  const loadingRoot = Array.from(document.querySelectorAll('div')).find((d) =>
    classOf(d).includes('z-50') && classOf(d).includes('bg-black') &&
    (d.textContent || '').trim().startsWith('Loading'));
  const titleRoot = Array.from(document.querySelectorAll('div')).find((d) =>
    classOf(d).includes('z-40') && classOf(d).includes('pointer-events-none') &&
    (d.textContent || '').includes('ME/CFS Community Gallery'));

  const canvas = document.querySelector('canvas');
  const ancestors = [];
  if (canvas) {
    let node = canvas.parentElement;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      ancestors.push({ cls: classOf(node).slice(0, 46), opacity: cs.opacity, filter: cs.filter });
      node = node.parentElement;
    }
  }
  const blurOf = (f) => { const m = /blur\(([\d.]+)px\)/.exec(f || ''); return m ? parseFloat(m[1]) : 0; };
  const offenders = ancestors.filter((a) => parseFloat(a.opacity) < 0.99 || blurOf(a.filter) > 0.1);

  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
  };
  const overlap = (a, b) => {
    if (!a || !b) return null;
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
    return { w: Math.round(x), h: Math.round(y), area: Math.round(x * y) };
  };

  const menu = document.querySelector('.menu-button');
  const label = document.querySelector('.menu-button-label');
  const labelStyle = label ? getComputedStyle(label) : null;
  const menuStyle = menu ? getComputedStyle(menu) : null;

  const stripRoot = document.querySelector('.now-playing-strip');
  const stripPill = stripRoot ? stripRoot.querySelector('div') : null;
  const chipButton = document.querySelector('[aria-label^="Return to your visit"]');
  const chipPill = chipButton ? chipButton.parentElement : null;

  const playButton = byText('Start the Tour');
  const exitButton = byLabel('Exit tour');
  const nextButton = byLabel('Next artwork');
  const counterEl = Array.from(document.querySelectorAll('div, span, p'))
    .filter((el) => /^\d+\s*\/\s*\d+/.test((el.textContent || '').trim()) && isVisible(el)).pop();

  const conditions = {
    canvasPresent: !!canvas && canvas.width > 0 && canvas.height > 0,
    sceneSettled: !!canvas && ancestors.length > 0 && offenders.length === 0,
    loadingScreenGone: !loadingRoot || !isVisible(loadingRoot),
    titleOverlayGone: !titleRoot || !isVisible(titleRoot),
    menuButtonVisible: !!menu && isVisible(menu),
    primaryControlVisible: args.mode === 'entrance' ? !!playButton : !!exitButton,
    frameCounterMatches: args.mode === 'entrance'
      ? true
      : !!counterEl && (counterEl.textContent || '').trim().split('/')[0].trim() === String(args.frame + 1),
    stripAsRequested: args.expectStrip ? !!stripRoot : !stripRoot,
    chipAsRequested: args.expectChip ? !!chipPill : !chipPill,
  };
  const unmet = Object.keys(conditions).filter((k) => !conditions[k]);

  const menuRect = rect(menu);
  const stripRect = rect(stripPill);
  const chipRect = rect(chipPill);

  return {
    ready: unmet.length === 0,
    unmet,
    conditions,
    evidence: {
      href: window.location.href,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dpr: window.devicePixelRatio,
      renderer: (() => {
        try {
          const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
          if (!gl) return null;
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        } catch { return null; }
      })(),
      requestAnimationFrame: typeof window.requestAnimationFrame === 'function',
      labelVisibleAttr: menu ? menu.getAttribute('data-label-visible') : null,
      labelText: label ? (label.textContent || '').trim() : null,
      ariaLabel: menu ? menu.getAttribute('aria-label') : null,
      ariaExpanded: menu ? menu.getAttribute('aria-expanded') : null,
      iconPresent: menu ? !!menu.querySelector('svg') : false,
      label: label && labelStyle ? {
        rect: rect(label),
        clientWidth: label.clientWidth,
        scrollWidth: label.scrollWidth,
        clipped: label.scrollWidth > label.clientWidth + 0.5,
        maxWidth: labelStyle.maxWidth,
        opacity: Number(labelStyle.opacity),
        fontSize: labelStyle.fontSize,
        transitionProperty: labelStyle.transitionProperty,
        transitionDuration: labelStyle.transitionDuration,
        transitionDelay: labelStyle.transitionDelay,
      } : null,
      button: menu && menuStyle ? {
        rect: menuRect,
        paddingLeft: menuStyle.paddingLeft,
        paddingRight: menuStyle.paddingRight,
        gap: menuStyle.gap,
        borderRadius: menuStyle.borderRadius,
        transitionProperty: menuStyle.transitionProperty,
        transitionDuration: menuStyle.transitionDuration,
      } : null,
      strip: stripRoot ? {
        rect: stripRect,
        text: (stripRoot.textContent || '').trim().slice(0, 90),
        overlapWithMenu: overlap(menuRect, stripRect),
      } : null,
      chip: chipPill ? {
        rect: chipRect,
        text: (chipButton.textContent || '').trim().slice(0, 70),
        overlapWithMenu: overlap(menuRect, chipRect),
      } : null,
      counterText: counterEl ? (counterEl.textContent || '').trim() : null,
      controls: { startTour: !!playButton, exitTour: !!exitButton, nextArtwork: !!nextButton },
      offenders,
    },
  };
}

async function waitReady(page, args, label) {
  const started = Date.now();
  let stable = 0;
  let previousKey = null;
  let last = null;
  while (Date.now() - started < BUDGET_MS) {
    let snap;
    try {
      snap = await page.evaluate(probe, args);
    } catch (err) {
      snap = { ready: false, unmet: ['probe-failed'], conditions: {}, evidence: { probeError: String(err.message || err) } };
    }
    const key = JSON.stringify({ c: snap.conditions, l: snap.evidence.label, s: snap.evidence.strip, ch: snap.evidence.chip });
    stable = key === previousKey ? stable + 1 : 1;
    previousKey = key;
    last = snap;
    if (snap.ready && stable >= STABLE_NEEDED) {
      log(`[ready] ${label} after ${Date.now() - started}ms (stable x${stable})`);
      return last;
    }
    await sleep(POLL_MS);
  }
  log(`[TIMEOUT] ${label}: unmet=${(last && last.unmet || []).join(',')} offenders=${JSON.stringify(last && last.evidence.offenders)}`);
  return last;
}

async function enterGallery(page) {
  const enter = page.getByRole('button', { name: 'Enter the gallery' });
  await enter.first().waitFor({ state: 'visible', timeout: 25000 });
  for (let i = 0; i < 5; i++) {
    await enter.first().click().catch(() => {});
    const left = await page.waitForFunction(() => !document.querySelector('.door-enter'), null, { timeout: 4000 })
      .then(() => true).catch(() => false);
    if (left) { log(`[door] left after ${i + 1} click(s)`); return true; }
  }
  log('[door] door never left');
  return false;
}

/**
 * What a trace says about "the word is never read half-cut": find the first
 * frame where the word is actually visible (opacity >= 0.05) and check whether
 * the box is already narrower than the text at that moment.
 */
function traceVerdict(frames) {
  const firstVisible = frames.find((s) => s.opacity >= 0.05) || null;
  const firstClipping = frames.find((s) => s.clientWidth > 0 && s.scrollWidth > s.clientWidth + 0.5) || null;
  const clippedWhileVisible = frames.find((s) => s.opacity >= 0.05 && s.clientWidth > 0 && s.scrollWidth > s.clientWidth + 0.5) || null;
  return {
    frames: frames.length,
    firstVisible: firstVisible && { t: firstVisible.t, opacity: firstVisible.opacity, clientWidth: firstVisible.clientWidth, scrollWidth: firstVisible.scrollWidth, clipped: firstVisible.scrollWidth > firstVisible.clientWidth + 0.5 },
    firstClipping: firstClipping && { t: firstClipping.t, opacity: firstClipping.opacity, clientWidth: firstClipping.clientWidth },
    clippedWhileVisible: clippedWhileVisible && { t: clippedWhileVisible.t, opacity: clippedWhileVisible.opacity, clientWidth: clippedWhileVisible.clientWidth, scrollWidth: clippedWhileVisible.scrollWidth },
  };
}

function mergeReport(state, data) {
  const file = path.join(OUT, 'report.json');
  let current = {};
  try { current = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
  current[state] = data;
  fs.writeFileSync(file, JSON.stringify(current, null, 2));
}

/** Starts a per-frame sampler in the page; read it from window.__trace. */
async function startSampler(page, ms) {
  await page.evaluate((duration) => {
    window.__trace = [];
    window.__traceDone = false;
    const t0 = performance.now();
    const tick = () => {
      const el = document.querySelector('.menu-button-label');
      const m = document.querySelector('.menu-button');
      if (el) {
        const cs = getComputedStyle(el);
        window.__trace.push({
          t: Math.round(performance.now() - t0),
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          opacity: Number(cs.opacity),
          transitionProperty: cs.transitionProperty,
          attr: m ? m.getAttribute('data-label-visible') : null,
          buttonWidth: m ? Math.round(m.getBoundingClientRect().width) : null,
        });
      }
      if (performance.now() - t0 < duration) requestAnimationFrame(tick);
      else window.__traceDone = true;
    };
    requestAnimationFrame(tick);
  }, ms);
}

async function launch() {
  return chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--disable-vulkan-surface'],
  }).catch((e) => { log(`[launch] chrome channel failed (${e.message.split('\n')[0]}), using bundled chromium`); return chromium.launch({ headless: true }); });
}

/**
 * The artwork panel's share control, measured box by box. Self-contained: it is
 * serialized to the page, so it cannot reference anything outside itself.
 */
function panelProbe() {
  const classOf = (el) => (typeof el.className === 'string' ? el.className : '');
  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const op = parseFloat(cs.opacity);
      if (!Number.isNaN(op) && op <= 0.01) return false;
      node = node.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const byLabel = (label) => Array.from(document.querySelectorAll('[aria-label]'))
    .find((el) => el.getAttribute('aria-label') === label && visible(el));
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
  };
  const overlap = (a, b) => {
    if (!a || !b) return null;
    const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
    const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
    return Math.round(w * h);
  };
  const inside = (r) => !r || (r.x >= 0 && r.right <= window.innerWidth && r.y >= 0 && r.bottom <= window.innerHeight);

  const share = byLabel('Share this artwork') || byLabel('Share this room');
  const heart = byLabel('Add to shelf') || byLabel('Remove from shelf');
  const close = byLabel('Close');
  const title = document.querySelector('h2');
  const pill = Array.from(document.querySelectorAll('div'))
    .find((d) => classOf(d).includes('bottom-full') && /copied|Could not copy|shared/i.test(d.textContent || '') && visible(d));
  const label = document.querySelector('label[for="artwork-share-link"]');
  const input = document.querySelector('#artwork-share-link');
  const hint = document.querySelector('#artwork-share-link-hint');

  const shareRect = rect(share);
  const heartRect = rect(heart);
  const closeRect = rect(close);
  const pillRect = rect(pill);
  const titleRect = rect(title);
  const inputRect = rect(input);
  const labelRect = rect(label);
  const hintRect = rect(hint);

  return {
    share: shareRect,
    shareLabel: share ? share.getAttribute('aria-label') : null,
    shareIcon: share ? !!share.querySelector('svg') : false,
    heart: heartRect,
    close: closeRect,
    title: titleRect,
    gapShareHeart: shareRect && heartRect ? Math.round(heartRect.x - shareRect.right) : null,
    gapHeartClose: heartRect && closeRect ? Math.round(closeRect.x - heartRect.right) : null,
    pill: pillRect,
    pillText: pill ? (pill.textContent || '').trim() : null,
    label: labelRect,
    input: inputRect,
    inputValue: input ? input.value : null,
    inputFocused: input ? document.activeElement === input : false,
    inputScrolledToStart: input ? input.scrollLeft === 0 : null,
    hint: hintRect,
    overlapShareHeart: overlap(shareRect, heartRect),
    overlapShareClose: overlap(shareRect, closeRect),
    overlapPillTitle: overlap(pillRect, titleRect),
    overlapPillShare: overlap(pillRect, shareRect),
    overlapPillHeart: overlap(pillRect, heartRect),
    overlapInputTitle: overlap(inputRect, titleRect),
    overlapInputLabel: overlap(inputRect, labelRect),
    pillInsideViewport: pillRect ? inside(pillRect) : null,
    controlsInsideViewport: [shareRect, heartRect, closeRect].every(inside),
    fallbackInsideViewport: [labelRect, inputRect, hintRect].every(inside),
    liveRegions: Array.from(document.querySelectorAll('[role="status"][aria-live]'))
      .map((el) => (el.textContent || '').trim()).filter(Boolean),
  };
}

/** Real path to the panel: tap the artwork, then the lightbox's info button. */
async function openArtworkPanel(page) {
  const info = page.getByRole('button', { name: 'Read artwork information' });
  const vp = page.viewportSize();
  await page.mouse.click(Math.round(vp.width / 2), Math.round(vp.height * 0.5));
  const lit = await info.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  if (lit) {
    await info.click();
    log('[panel] opened via canvas tap -> lightbox -> info button');
  } else {
    log('[panel] canvas tap did not open the lightbox; dispatching the plaque event');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-artwork-info', { detail: { x: 120, y: 420 } })));
  }
  await page.getByRole('button', { name: /^Share this (artwork|room)$/ }).waitFor({ state: 'visible', timeout: 8000 });
}

async function main() {
  const states = (process.argv[2] || 'ABCD').split('');
  const browser = await launch();
  const shot = async (page, name) => {
    const png = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: png, type: 'png' });
    log(`[shot] ${png}`);
    return png;
  };

  if (states.includes('A')) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-GB', reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => log(`[pageerror A] ${String(e).slice(0, 140)}`));
    log('--- A: overview, no messages');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await enterGallery(page);
    const snap = await waitReady(page, { mode: 'entrance', frame: -1, expectStrip: false, expectChip: false }, 'A overview');
    mergeReport('A', { ...snap, png: await shot(page, 'A-overview-no-messages') });

    log('--- A2: collapse trace (Start the Tour)');
    await page.evaluate(() => {
      window.__trace = [];
      window.__traceDone = false;
      const t0 = performance.now();
      const tick = () => {
        const el = document.querySelector('.menu-button-label');
        const m = document.querySelector('.menu-button');
        if (el) {
          const cs = getComputedStyle(el);
          window.__trace.push({
            t: Math.round(performance.now() - t0),
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            opacity: Number(cs.opacity),
            buttonWidth: m ? Math.round(m.getBoundingClientRect().width) : null,
          });
        }
        if (performance.now() - t0 < 700) requestAnimationFrame(tick);
        else window.__traceDone = true;
      };
      requestAnimationFrame(tick);
    });
    await page.getByRole('button', { name: 'Start the Tour' }).first().click();
    await page.waitForFunction(() => window.__traceDone === true, null, { timeout: 6000 }).catch(() => log('[trace] sampler did not finish'));
    const trace = await page.evaluate(() => window.__trace);
    const cutting = trace.filter((s) => s.scrollWidth > s.clientWidth + 0.5);
    log(`[trace] ${trace.length} frames; first clipping at ${cutting.length ? `${cutting[0].t}ms (opacity ${cutting[0].opacity.toFixed(2)}, w=${cutting[0].clientWidth})` : 'never'}`);
    mergeReport('trace', { frames: trace, firstClipping: cutting[0] || null });
    await ctx.close();
  }

  if (states.includes('B')) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-GB', reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => log(`[pageerror B] ${String(e).slice(0, 140)}`));
    log('--- B: viewing an artwork with a content note (room-1 frame 1)');
    await page.goto(`${BASE}/?room=room-1&frame=1`, { waitUntil: 'domcontentloaded' });
    const snap = await waitReady(page, { mode: 'artwork', frame: 1, expectStrip: true, expectChip: false }, 'B artwork');
    mergeReport('B', { ...snap, png: await shot(page, 'B-artwork-with-content-note') });
    await ctx.close();
  }

  if (states.includes('C')) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-GB', reducedMotion: 'no-preference' });
    await ctx.addInitScript(() => {
      window.localStorage.setItem('cfs-gallery:visit-position:v1', JSON.stringify({ roomId: 'room-2', frameIndex: 0, updatedAt: Date.now() }));
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => log(`[pageerror C] ${String(e).slice(0, 140)}`));
    log('--- C: shared-link landing with a stored position (the chip)');
    await page.goto(`${BASE}/?room=room-1`, { waitUntil: 'domcontentloaded' });
    const snap = await waitReady(page, { mode: 'entrance', frame: -1, expectStrip: false, expectChip: true }, 'C chip');
    mergeReport('C', { ...snap, png: await shot(page, 'C-overview-with-return-chip') });
    await ctx.close();
  }

  if (states.includes('D')) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-GB', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => log(`[pageerror D] ${String(e).slice(0, 140)}`));
    log('--- D: prefers-reduced-motion — same flip as F (Exit tour), must be immediate');
    await page.goto(`${BASE}/?room=room-1&frame=1`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, { mode: 'artwork', frame: 1, expectStrip: true, expectChip: false }, 'D artwork (reduced motion)');
    await startSampler(page, 1500);
    await page.getByRole('button', { name: 'Exit tour' }).first().click();
    await page.waitForFunction(() => window.__traceDone === true, null, { timeout: 6000 }).catch(() => log('[trace D] sampler did not finish'));
    const before = await page.evaluate(probe, { mode: 'entrance', frame: -1, expectStrip: false, expectChip: false });
    const rmTrace = await page.evaluate(() => window.__trace);
    const verdict = traceVerdict(rmTrace);
    log(`[D] ${rmTrace.length} frames; ${JSON.stringify(verdict)}`);
    log(`[D] label transition under reduced motion: property=${before.evidence.label && before.evidence.label.transitionProperty} duration=${before.evidence.label && before.evidence.label.transitionDuration}`);
    mergeReport('D', {
      ...before,
      png: await shot(page, 'D-reduced-motion-after-exit'),
      reducedMotionTrace: rmTrace,
      verdict,
    });
    await ctx.close();
  }

  if (states.includes('E')) {
    // The collapse needs a state flip while the button is mounted: the tour
    // entry goes through a modal, so click through it inside the trace window.
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-GB', reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => log(`[pageerror E] ${String(e).slice(0, 140)}`));
    log('--- E: collapse trace (overview -> artwork)');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await enterGallery(page);
    await waitReady(page, { mode: 'entrance', frame: -1, expectStrip: false, expectChip: false }, 'E overview');
    await startSampler(page, 6000);
    await page.getByRole('button', { name: 'Start the Tour' }).first().click();
    await sleep(700);
    const modalButtons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean));
    log(`[E] buttons while modalling: ${JSON.stringify(modalButtons.slice(0, 12))}`);
    const play = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button'))
        .find((b) => /^(start|begin|continue|guided|silent|own pace)/i.test((b.textContent || '').trim()));
      if (!el) return null;
      el.click();
      return (el.textContent || '').trim();
    });
    log(`[E] tour start button: ${play}`);
    await page.waitForFunction(() => window.__traceDone === true, null, { timeout: 8000 }).catch(() => log('[trace E] sampler did not finish'));
    const trace = await page.evaluate(() => window.__trace);
    const verdict = traceVerdict(trace);
    log(`[E] ${trace.length} frames; ${verdict}`);
    mergeReport('E', { frames: trace, verdict, modalButtons });
    await ctx.close();
  }

  if (states.includes('F')) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-GB', reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => log(`[pageerror F] ${String(e).slice(0, 140)}`));
    log('--- F: expand trace (artwork -> overview, Exit tour)');
    await page.goto(`${BASE}/?room=room-1&frame=1`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, { mode: 'artwork', frame: 1, expectStrip: true, expectChip: false }, 'F artwork');
    await startSampler(page, 2000);
    await page.getByRole('button', { name: 'Exit tour' }).first().click();
    await page.waitForFunction(() => window.__traceDone === true, null, { timeout: 6000 }).catch(() => log('[trace F] sampler did not finish'));
    const trace = await page.evaluate(() => window.__trace);
    const verdict = traceVerdict(trace);
    log(`[F] ${trace.length} frames; ${verdict}`);
    mergeReport('F', { frames: trace, verdict });
    await ctx.close();
  }

  if (states.includes('G')) {
    // The icon-only button must still open the drawer: the word is gone, the
    // control is not.
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-GB', reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => log(`[pageerror G] ${String(e).slice(0, 140)}`));
    log('--- G: tap the collapsed (icon-only) menu button');
    await page.goto(`${BASE}/?room=room-1&frame=1`, { waitUntil: 'domcontentloaded' });
    await waitReady(page, { mode: 'artwork', frame: 1, expectStrip: true, expectChip: false }, 'G artwork');
    const beforeClick = await page.evaluate(probe, { mode: 'artwork', frame: 1, expectStrip: true, expectChip: false });
    await page.locator('.menu-button').click();
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({
      drawerCloseVisible: !!Array.from(document.querySelectorAll('[aria-label="Close menu"]')).find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      }),
      roomsHeading: Array.from(document.querySelectorAll('p')).some((p) => (p.textContent || '').trim() === 'Rooms'),
      drawerText: (document.body.innerText || '').split('\n').filter((l) => l.trim()).slice(0, 12),
      menuButtonStillMounted: !!document.querySelector('.menu-button'),
    }));
    log(`[G] ${JSON.stringify(after)}`);
    mergeReport('G', { beforeClick: beforeClick.evidence, after, png: await shot(page, 'G-collapsed-button-opens-menu') });
    await ctx.close();
  }

  if (states.includes('H')) {
    // The share control in the artwork panel, on a phone. Two states are worth
    // looking at: the confirmation that the link was copied, and the fallback
    // when the clipboard refuses them — measured box by box, not just captured.
    for (const variant of ['copied', 'manual']) {
      const ctx = await browser.newContext({
        viewport: VIEWPORT, deviceScaleFactor: DPR, locale: 'en-GB', reducedMotion: 'no-preference',
      });
      if (variant === 'copied') {
        await ctx.grantPermissions(['clipboard-write'], { origin: BASE });
      } else {
        await ctx.addInitScript(() => {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
          });
          delete navigator.share;
        });
      }
      const page = await ctx.newPage();
      page.on('pageerror', (e) => log(`[pageerror H/${variant}] ${String(e).slice(0, 140)}`));
      log(`--- H/${variant}: phone, artwork panel + share`);
      await page.goto(`${BASE}/?room=room-1&art=static-silva-quieta`, { waitUntil: 'domcontentloaded' });
      await waitReady(page, { mode: 'artwork', frame: 2, expectStrip: false, expectChip: false }, `H/${variant} artwork`);
      await openArtworkPanel(page);
      // The panel scales in over 340ms from opacity 0; measure the buttons once
      // the panel has arrived, or the boxes read as absent mid-animation.
      await page.waitForTimeout(600);
      const closed = await page.evaluate(panelProbe);
      await page.getByRole('button', { name: 'Share this artwork' }).click();
      await page.waitForTimeout(700);
      const shared = await page.evaluate(panelProbe);
      const verdict = {
        buttonsInARow: closed.gapShareHeart !== null && closed.gapShareHeart >= 0 && closed.gapHeartClose >= 0,
        noOverlapBetweenControls: !closed.overlapShareHeart && !closed.overlapShareClose,
        controlsInsideViewport: closed.controlsInsideViewport,
        notice: shared.pillText,
        noticeInsideViewport: shared.pillInsideViewport,
        noticeOverTitle: shared.overlapPillTitle,
        fallbackInsideViewport: shared.fallbackInsideViewport,
        fallbackOverTitle: shared.overlapInputTitle,
        liveRegions: shared.liveRegions,
        inputValue: shared.inputValue,
      };
      log(`[H/${variant}] ${JSON.stringify(verdict)}`);
      mergeReport(`H-${variant}`, { closed, shared, verdict, png: await shot(page, `H-${variant}-phone-panel-share`) });
      await ctx.close();
    }
  }

  await browser.close();

  const report = JSON.parse(fs.readFileSync(path.join(OUT, 'report.json'), 'utf8'));
  for (const key of ['A', 'B', 'C', 'D']) {
    const s = report[key];
    if (!s) continue;
    log(`\n== ${key} == ready=${s.ready} ${s.png || ''}`);
    log(`  href      : ${s.evidence.href}  ${s.evidence.innerWidth}x${s.evidence.innerHeight} dpr=${s.evidence.dpr}`);
    log(`  renderer  : ${s.evidence.renderer}`);
    log(`  label     : attr=${s.evidence.labelVisibleAttr} text="${s.evidence.labelText}" w=${s.evidence.label && s.evidence.label.clientWidth} textW=${s.evidence.label && s.evidence.label.scrollWidth} clipped=${s.evidence.label && s.evidence.label.clipped} opacity=${s.evidence.label && s.evidence.label.opacity}`);
    log(`  button    : ${JSON.stringify(s.evidence.button && s.evidence.button.rect)} pad=${s.evidence.button && s.evidence.button.paddingLeft}/${s.evidence.button && s.evidence.button.paddingRight} gap=${s.evidence.button && s.evidence.button.gap} aria=${s.evidence.ariaLabel} icon=${s.evidence.iconPresent}`);
    log(`  strip     : ${s.evidence.strip ? `${JSON.stringify(s.evidence.strip.rect)} overlap=${JSON.stringify(s.evidence.strip.overlapWithMenu)} "${s.evidence.strip.text}"` : 'none'}`);
    log(`  chip      : ${s.evidence.chip ? `${JSON.stringify(s.evidence.chip.rect)} overlap=${JSON.stringify(s.evidence.chip.overlapWithMenu)} "${s.evidence.chip.text}"` : 'none'}`);
    if (s.unmet && s.unmet.length) log(`  UNMET     : ${s.unmet.join(', ')}`);
    if (s.reducedMotionTrace) log(`  rm-trace  : ${JSON.stringify(s.verdict)} labelTransition=${s.evidence.label && s.evidence.label.transitionProperty}/${s.evidence.label && s.evidence.label.transitionDuration}`);
  }
  for (const key of ['E', 'F']) {
    const t = report[key];
    if (!t) continue;
    log(`\n== trace ${key} ==`);
    log(`  ${JSON.stringify(t.verdict)}`);
  }
  const t = report.trace && report.trace.frames || [];
  if (t.length) {
    log(`\n== collapse trace (${t.length} frames) ==`);
    for (const s of t) if (s.t <= 420) log(`  t=${String(s.t).padStart(3)}ms labelW=${String(s.clientWidth).padStart(2)} textW=${s.scrollWidth} opacity=${s.opacity.toFixed(2)} buttonW=${s.buttonWidth}`);
  }
  log(`\nreport: ${path.join(OUT, 'report.json')}`);
}

main().catch((err) => { console.error('FAILED:', err); process.exitCode = 1; });

#!/usr/bin/env node
/**
 * visual-smoke.cjs — small, reusable visual capture tool for the CFS Community Gallery.
 *
 * Two modes:
 *   --view entrance (default)  : homepage -> real click on the accessible "Enter the gallery"
 *                                button -> capture the gallery overview with "Start the Tour"
 *                                still present. The tour is NOT started.
 *   --view artwork             : /?room=<room>&frame=<n> -> capture that single frame/artwork.
 *                                This mode starts the tour at that frame by design (see
 *                                docs/visual-testing.md, "Views" section).
 *
 * Readiness is DOM-driven: it waits on real accessible controls plus the *computed*
 * opacity/filter of every ancestor of the WebGL canvas (MuseumStage drives blur via
 * AnimationContext: 8px -> 0 on title fade, not on "Start the Tour"). It requires
 * stable consecutive samples and never injects CSS or alters UI state.
 *
 * Usage / exit codes: see `--help` and docs/visual-testing.md.
 * Output: one directory per run under /tmp/cfs-visual-smoke-<unique-run-id>.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const os = require('os');
const crypto = require('crypto');

const DEFAULT_BASE_URL = 'http://localhost:3002';
const DEFAULT_VIEWPORT = { width: 1280, height: 960 };
const DEFAULT_TIMEOUT_MS = 75000; // inside the 60-90s budget
const POLL_MS = 300;              // sample spacing
const REQUIRED_STABLE_SAMPLES = 3; // consecutive identical ready samples
const MAX_KEPT_SAMPLES = 24;
const MAX_LIST = 20;
const MAX_TEXT = 600;
// Every wait is clamped to what is left of the run budget; these are the caps.
const PROBE_TIMEOUT_MS = 5000;          // one page.evaluate
const CLICK_TIMEOUT_MS = 5000;          // one click
const DOOR_LEFT_TIMEOUT_MS = 4000;      // "did the door disappear?" check
const HYDRATION_TIMEOUT_MS = 15000;
const DOOR_VISIBLE_TIMEOUT_MS = 20000;
const SCREENSHOT_TIMEOUT_MS = 15000;    // the capture
const DIAGNOSTIC_SCREENSHOT_TIMEOUT_MS = 15000; // after a timeout: bounded, never unbounded
const MIN_WAIT_MS = 500;

const EXIT_OK = 0;
const EXIT_BAD_ARGS = 2;
const EXIT_TIMEOUT = 3;
const EXIT_RUNTIME = 4;

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

// ---------------------------------------------------------------------------
// Repo facts (read from the source of truth, not hardcoded where avoidable)
// ---------------------------------------------------------------------------

function readRepoRoomIds() {
  try {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'config', 'roomsConfig.ts'), 'utf8');
    const ids = [];
    const re = /\bid:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src))) ids.push(m[1]);
    return ids;
  } catch {
    return [];
  }
}

function readRoomCapacity() {
  try {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'config', 'roomConfig.ts'), 'utf8');
    const m = src.match(/ROOM_CAPACITY\s*=\s*(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HELP = `visual-smoke.cjs — capture two real gallery views with verified readiness.

Usage:
  node scripts/visual-smoke.cjs [options]

Options:
  --view <entrance|artwork>   View to capture. Default: entrance.
  --room <room-id>            Room id for --view artwork (e.g. room-1). Default: room-1.
  --frame <n>                 Frame index for --view artwork (0-based). Default: 0.
  --base-url <url>            Gallery base URL. Default: ${DEFAULT_BASE_URL}
  --timeout <ms>              Total readiness budget per run, 5000-300000. Default: ${DEFAULT_TIMEOUT_MS}
  --out-dir <dir>             Parent directory for the run's own fresh subdirectory.
                              Default parent: the OS temp dir. The subdirectory is created with
                              mkdtempSync, so result.json/PNG are never reused.
  --run-id <id>               Run id used in file names (default: timestamp + random suffix).
  --headed                    Run the browser with a visible window (debugging only).
  --help                      Show this help and exit 0.

Views:
  entrance  Homepage, real click on the accessible button "Enter the gallery", then capture the
            gallery overview with the "Start the Tour" control still present. "Start the Tour"
            is never clicked.
  artwork   Opens /?room=<room-id>&frame=<n> directly. The gallery starts the tour at that frame,
            so the capture shows that single artwork/frame with the tour controls present.

Exit codes:
  0  captured and verified
  2  invalid arguments (nothing is launched)
  3  readiness timeout or missing anchor (diagnostic screenshot + JSON are saved)
  4  runtime failure: server unreachable, browser could not launch, or the capture could not be
     verified afterwards (readiness lost, no WebGL renderer/context, uncaught page error).
     The PNG and the diagnostic JSON are still written.

Outputs: one fresh directory per run containing a uniquely named PNG plus result.json. Never writes
to the shared screenshots or the app itself.
`;

function parseArgs(argv) {
  const opts = {
    view: 'entrance',
    room: 'room-1',
    frame: 0,
    roomProvided: false,
    frameProvided: false,
    baseUrl: DEFAULT_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    outDir: null,
    runId: null,
    headed: false,
    help: false,
  };

  const takesValue = new Set(['--view', '--room', '--frame', '--base-url', '--timeout', '--out-dir', '--run-id']);
  const errors = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { opts.help = true; continue; }
    if (arg === '--headed') { opts.headed = true; continue; }

    let name = arg;
    let value = null;
    const eq = arg.indexOf('=');
    if (arg.startsWith('--') && eq !== -1) {
      name = arg.slice(0, eq);
      value = arg.slice(eq + 1);
    }
    if (!takesValue.has(name)) { errors.push(`unknown option: ${arg}`); continue; }
    if (value === null) {
      value = argv[++i];
      if (value === undefined) { errors.push(`missing value for ${name}`); continue; }
    }

    switch (name) {
      case '--view': opts.view = value; break;
      case '--room': opts.room = value; opts.roomProvided = true; break;
      case '--frame': opts.frame = value; opts.frameProvided = true; break;
      case '--base-url': opts.baseUrl = value; break;
      case '--timeout': opts.timeout = value; break;
      case '--out-dir': opts.outDir = value; break;
      case '--run-id': opts.runId = value; break;
      default: errors.push(`unknown option: ${arg}`);
    }
  }

  // --- validation (all of it happens before any browser is opened) ---
  if (opts.view !== 'entrance' && opts.view !== 'artwork') {
    errors.push(`--view must be "entrance" or "artwork" (got "${opts.view}")`);
  }

  const roomIds = readRepoRoomIds();
  if (opts.roomProvided && opts.view !== 'artwork') {
    errors.push('--room is only valid with --view artwork');
  }
  if (opts.frameProvided && opts.view !== 'artwork') {
    errors.push('--frame is only valid with --view artwork');
  }
  if (opts.view === 'artwork') {
    if (!/^room-\d+$/.test(String(opts.room))) {
      errors.push(`--room must look like "room-<n>" (got "${opts.room}")`);
    } else if (roomIds.length && !roomIds.includes(opts.room)) {
      errors.push(`--room "${opts.room}" is not a configured room (known: ${roomIds.join(', ')})`);
    }
    // Strict decimal digits: "" , "1e3", "0x1", "+1", " 1", "1.0" are all rejected here,
    // before any browser is opened.
    const frameRaw = String(opts.frame);
    const capacity = readRoomCapacity();
    if (!/^[0-9]+$/.test(frameRaw)) {
      errors.push(`--frame must be decimal digits only (got "${opts.frame}")`);
    } else if (capacity !== null && Number(frameRaw) >= capacity) {
      errors.push(`--frame must be < ${capacity} (room capacity) — got ${frameRaw}`);
    } else {
      opts.frame = Number(frameRaw);
    }
  }

  const timeout = Number(opts.timeout);
  if (!Number.isInteger(timeout) || timeout < 5000 || timeout > 300000) {
    errors.push(`--timeout must be an integer between 5000 and 300000 ms (got "${opts.timeout}")`);
  }
  opts.timeout = timeout;

  try {
    const parsed = new URL(opts.baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      errors.push(`--base-url must be http(s) (got "${opts.baseUrl}")`);
    }
    opts.baseUrl = parsed.origin; // normalise; the tool only ever opens paths on this origin
  } catch {
    errors.push(`--base-url is not a valid URL (got "${opts.baseUrl}")`);
  }

  if (opts.runId !== null && !/^[A-Za-z0-9._-]+$/.test(opts.runId)) {
    errors.push('--run-id may only contain letters, digits, dot, dash and underscore');
  }

  return { opts, errors };
}

// ---------------------------------------------------------------------------
// Preflight
// ---------------------------------------------------------------------------

function ping(url, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };
    let req;
    try {
      req = (url.startsWith('https:') ? https : http).request(url, { method: 'GET', timeout: timeoutMs }, (res) => {
        res.resume();
        done({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
      });
    } catch (err) {
      done({ ok: false, error: err.message });
      return;
    }
    req.on('timeout', () => { req.destroy(new Error(`preflight timeout after ${timeoutMs}ms`)); });
    req.on('error', (err) => done({ ok: false, error: err.message }));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// In-page readiness probe (serialised by Playwright; must be self-contained)
// ---------------------------------------------------------------------------

function readinessProbe(args) {
  const BLUR_TOLERANCE_PX = 0.1;
  const OPACITY_MIN = 0.99;

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

  const findButtonByText = (text) => Array.from(document.querySelectorAll('button'))
    .find((b) => (b.textContent || '').trim() === text && isVisible(b));

  const findButtonByLabel = (label) => Array.from(document.querySelectorAll('[aria-label]'))
    .find((el) => el.getAttribute('aria-label') === label && isVisible(el));

  const classOf = (el) => (typeof el.className === 'string' ? el.className : '');

  // LoadingScreen: fixed z-50 black overlay whose text starts with "Loading".
  const loadingRoot = Array.from(document.querySelectorAll('div')).find((d) =>
    classOf(d).includes('z-50') && classOf(d).includes('bg-black') &&
    (d.textContent || '').trim().startsWith('Loading'));

  // TitleOverlay: z-40, pointer-events-none, holds the gallery title h1.
  const titleRoot = Array.from(document.querySelectorAll('div')).find((d) =>
    classOf(d).includes('z-40') && classOf(d).includes('pointer-events-none') &&
    (d.textContent || '').includes('ME/CFS Community Gallery'));

  const canvas = document.querySelector('canvas');
  const ancestors = [];
  if (canvas) {
    let node = canvas.parentElement;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      ancestors.push({
        tag: node.tagName.toLowerCase(),
        cls: classOf(node).slice(0, 60),
        opacity: cs.opacity,
        filter: cs.filter,
        transition: cs.transitionProperty,
      });
      node = node.parentElement;
    }
  }

  const blurOf = (filter) => {
    const m = /blur\(([\d.]+)px\)/.exec(filter || '');
    return m ? parseFloat(m[1]) : 0;
  };

  const offenders = ancestors.filter((a) =>
    parseFloat(a.opacity) < OPACITY_MIN || blurOf(a.filter) > BLUR_TOLERANCE_PX);

  // Renderer: reuse the context three.js already created, never create a new one.
  let renderer = null;
  let rendererSource = null;
  let glError = null;
  let contextLost = null;
  if (canvas) {
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        rendererSource = gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl';
        contextLost = typeof gl.isContextLost === 'function' ? gl.isContextLost() : null;
        renderer = gl.getParameter(gl.RENDERER);
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const unmasked = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
          if (unmasked) renderer = unmasked;
        }
      } else {
        glError = 'canvas has no webgl2/webgl context';
      }
    } catch (err) {
      glError = String(err && err.message ? err.message : err);
    }
  }

  const menuButton = findButtonByLabel('Open menu');
  const playButton = findButtonByText('Start the Tour');
  const exitTourButton = findButtonByLabel('Exit tour');
  const nextArtworkButton = findButtonByLabel('Next artwork');
  const prevArtworkButton = findButtonByLabel('Previous artwork');
  // The last actual artwork in a room has no "Next artwork": its forward action is the
  // existing "Finish tour at the rest view" control (TourControls aria-label).
  const finishTourButton = findButtonByLabel('Finish tour at the rest view');
  const tourCounterEl = Array.from(document.querySelectorAll('div, span, p'))
    .filter((el) => /^\d+\s*\/\s*\d+/.test((el.textContent || '').trim()) && isVisible(el))
    .pop();
  const tourCounterText = tourCounterEl ? (tourCounterEl.textContent || '').trim() : null;

  const conditions = {
    canvasPresent: !!canvas && canvas.width > 0 && canvas.height > 0,
    sceneSettled: !!canvas && ancestors.length > 0 && offenders.length === 0,
    loadingScreenGone: !loadingRoot || !isVisible(loadingRoot),
    titleOverlayGone: !titleRoot || !isVisible(titleRoot),
    menuButtonVisible: !!menuButton,
  };

  if (args.mode === 'entrance') {
    conditions.primaryControlVisible = !!playButton;          // "Start the Tour" still on screen
    conditions.secondaryControlsDone = true;                  // n/a for the overview
    conditions.tourStateAsRequested = !exitTourButton;        // overview: tour must NOT be running
    conditions.frameCounterMatchesRequest = true;             // n/a
  } else {
    conditions.primaryControlVisible = !!exitTourButton;       // a frame view is active
    // Forward navigation is "Next artwork", or "Finish tour at the rest view" when the
    // requested frame is the last actual artwork of the room.
    conditions.secondaryControlsDone = !!prevArtworkButton && (!!nextArtworkButton || !!finishTourButton);
    conditions.tourStateAsRequested = !!exitTourButton;
    const expectedCounter = String(args.frame + 1);
    conditions.frameCounterMatchesRequest = !!tourCounterText &&
      tourCounterText.split('/')[0].trim() === expectedCounter;
  }

  const unmet = Object.keys(conditions).filter((k) => !conditions[k]);

  return {
    ready: unmet.length === 0,
    unmet,
    conditions,
    evidence: {
      mode: args.mode,
      requestedUrl: args.requestedUrl,
      href: window.location.href,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      canvas: canvas
        ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight }
        : null,
      menuButtonLabel: menuButton ? menuButton.getAttribute('aria-label') : null,
      startTourVisible: !!playButton,
      doorEnterVisible: !!document.querySelector('.door-enter'),
      exitTourVisible: !!exitTourButton,
      nextArtworkVisible: !!nextArtworkButton,
      previousArtworkVisible: !!prevArtworkButton,
      finishTourVisible: !!finishTourButton,
      tourCounterText,
      loadingText: loadingRoot ? (loadingRoot.textContent || '').trim().slice(0, 40) : null,
      titleText: titleRoot ? (titleRoot.textContent || '').trim().slice(0, 60) : null,
      ancestors,
      settlingOffenders: offenders,
      renderer,
      rendererSource,
      glError,
      contextLost,
      documentTitle: document.title,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newRunId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function trimList(list, cap = MAX_LIST) {
  const out = list.slice(0, cap).map((s) => (typeof s === 'string' ? s.slice(0, MAX_TEXT) : s));
  if (list.length > cap) out.push(`... ${list.length - cap} more suppressed`);
  return out;
}

/** Bounds any promise so no single step can run past the run budget. */
function bounded(promise, ms, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), Math.max(1, ms));
  });
  return Promise.race([promise, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

function makeRecorder(baseOrigin) {
  const state = {
    pageErrors: [],
    consoleErrors: [],
    consoleWarnings: [],
    failedRequests: [],
    httpErrors: [],
  };
  const relevant = (url) => {
    if (!url) return false;
    if (url.startsWith('data:') || url.startsWith('blob:')) return false;
    try {
      const u = new URL(url);
      return u.origin === baseOrigin;
    } catch {
      return false;
    }
  };
  return {
    state,
    attach(page) {
      page.on('pageerror', (err) => {
        if (state.pageErrors.length < MAX_LIST) state.pageErrors.push(String(err && err.message ? err.message : err));
      });
      page.on('console', (msg) => {
        const type = msg.type();
        // Uncaught page errors are fatal (see the caller); console errors/warnings are
        // recorded but benign (e.g. WebGL driver performance notices) and do not fail a run.
        if (type === 'warning') {
          if (state.consoleWarnings.length < MAX_LIST) state.consoleWarnings.push(msg.text());
          return;
        }
        if (type !== 'error') return;
        if (state.consoleErrors.length >= MAX_LIST) return;
        state.consoleErrors.push(msg.text());
      });
      page.on('requestfailed', (req) => {
        if (!relevant(req.url())) return;
        if (state.failedRequests.length >= MAX_LIST) return;
        const failure = req.failure();
        state.failedRequests.push({ url: req.url(), error: failure ? failure.errorText : 'unknown' });
      });
      page.on('response', (res) => {
        if (res.status() < 400) return;
        if (!relevant(res.url())) return;
        if (state.httpErrors.length >= MAX_LIST) return;
        state.httpErrors.push({ url: res.url(), status: res.status() });
      });
    },
    snapshot() {
      return {
        pageErrors: trimList(state.pageErrors),
        consoleErrors: trimList(state.consoleErrors),
        consoleWarnings: trimList(state.consoleWarnings),
        failedRequests: state.failedRequests.slice(0, MAX_LIST),
        httpErrors: state.httpErrors.slice(0, MAX_LIST),
      };
    },
  };
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function buildTimeoutReport({ opts, runId, url, recorder, samples, lastSnapshot, unmet, extra }) {
  return {
    status: 'timeout',
    reason: unmet && unmet.length
      ? `readiness conditions never became true: ${unmet.join(', ')}`
      : 'readiness never stabilised within the budget',
    note: 'TIMEOUT reported as-is. No cause is guessed: inspect conditions, computed ancestor styles, errors and failed requests below.',
    view: opts.view,
    room: opts.view === 'artwork' ? opts.room : null,
    frame: opts.view === 'artwork' ? opts.frame : null,
    url,
    requestedUrl: opts.view === 'artwork'
      ? `${opts.baseUrl}/?room=${encodeURIComponent(opts.room)}&frame=${opts.frame}`
      : `${opts.baseUrl}/`,
    viewport: DEFAULT_VIEWPORT,
    timeoutMs: opts.timeout,
    runId,
    unmetConditions: unmet || [],
    lastSnapshot: lastSnapshot ? lastSnapshot.evidence : null,
    samples,
    ...recorder.snapshot(),
    ...(extra || {}),
  };
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const { opts, errors } = parseArgs(argv);

  if (opts.help) {
    process.stdout.write(HELP);
    return EXIT_OK;
  }
  if (errors.length) {
    process.stderr.write('Invalid arguments:\n');
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.stderr.write('\nRun with --help for usage.\n');
    return EXIT_BAD_ARGS;
  }

  const runId = opts.runId || newRunId();
  // Fresh, never-reused output directory for every run. --out-dir names the PARENT
  // directory; mkdtempSync creates this run's own directory under it, so an existing
  // result.json or PNG can never be reused or overwritten.
  const outParent = path.resolve(opts.outDir || os.tmpdir());
  fs.mkdirSync(outParent, { recursive: true });
  const outDir = path.resolve(fs.mkdtempSync(path.join(outParent, 'cfs-visual-smoke-')));

  const viewSlug = opts.view === 'artwork'
    ? `artwork-${opts.room}-frame-${opts.frame}`
    : 'entrance';
  const pngName = `shot-${viewSlug}-${runId}.png`;
  const pngPath = path.resolve(outDir, pngName);
  const jsonPath = path.resolve(outDir, 'result.json');

  const targetUrl = opts.view === 'artwork'
    ? `${opts.baseUrl}/?room=${encodeURIComponent(opts.room)}&frame=${opts.frame}`
    : `${opts.baseUrl}/`;

  // Cheap, bounded failure when the server is not there — no browser is launched.
  const pre = await ping(opts.baseUrl, 5000);
  if (!pre.ok) {
    const msg = `Server unreachable at ${opts.baseUrl} (${pre.error || `HTTP ${pre.status}`}). Start it with "npm run dev" (port 3002) or pass --base-url.`;
    writeJson(jsonPath, {
      status: 'error',
      reason: 'server-unreachable',
      detail: msg,
      view: opts.view,
      room: opts.view === 'artwork' ? opts.room : null,
      frame: opts.view === 'artwork' ? opts.frame : null,
      url: targetUrl,
      viewport: DEFAULT_VIEWPORT,
      runId,
      browserLaunched: false,
      preflight: pre,
    });
    process.stderr.write(`ERROR: ${msg}\nEvidence: ${jsonPath}\n`);
    return EXIT_RUNTIME;
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch (err) {
    process.stderr.write(`ERROR: cannot load playwright from ${path.join(REPO_ROOT, 'node_modules')} (${err.message})\n`);
    return EXIT_RUNTIME;
  }
  const { chromium } = playwright;

  const recorder = makeRecorder(opts.baseUrl);
  const launchArgs = [
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
  ];

  let browser = null;
  let context = null;
  let page = null;
  let browserChannel = null;
  let launchWarning = null;

  try {
    // System Google Chrome first (that is the browser this tool targets), then the
    // bundled Playwright Chromium as a fallback. The chosen one is recorded.
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: !opts.headed, args: launchArgs });
      browserChannel = 'chrome (system)';
    } catch (systemErr) {
      launchWarning = `channel "chrome" failed: ${systemErr.message.split('\n')[0]}`;
      browser = await chromium.launch({ headless: !opts.headed, args: launchArgs });
      browserChannel = 'chromium (playwright bundle)';
    }

    context = await browser.newContext({
      viewport: DEFAULT_VIEWPORT,
      deviceScaleFactor: 1,
      locale: 'en-GB',
      reducedMotion: 'no-preference',
    });
    page = await context.newPage();
    recorder.attach(page);

    const started = Date.now();
    const deadline = started + opts.timeout;
    // Nothing may wait longer than the run budget: every bounded wait below is clamped
    // to what is left, with a small floor so the last attempt still happens.
    const remaining = () => Math.max(0, deadline - Date.now());
    const clampWait = (want) => Math.max(MIN_WAIT_MS, Math.min(want, remaining()));
    const samples = [];
    let stable = 0;
    let previousKey = null;
    let last = null;

    // --- navigation + the one real, semantic interaction this tool performs ---
    let navigationNote = null;
    let clickAttempts = null;
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: clampWait(30000) });
    } catch (err) {
      navigationNote = `goto failed: ${err.message.split('\n')[0]}`;
    }

    if (opts.view === 'entrance') {
      // The door is server-rendered, so "Enter the gallery" is visible *before* React
      // hydrates, and a click delivered in that window is silently dropped. The wait for
      // React's own props on the element is a fast-path convenience only — it relies on
      // React internals and can change; the REAL confirmation is that the door left.
      const enterButton = page.getByRole('button', { name: 'Enter the gallery' });
      try {
        await enterButton.first().waitFor({ state: 'visible', timeout: clampWait(DOOR_VISIBLE_TIMEOUT_MS) });
      } catch (err) {
        navigationNote = `"Enter the gallery" button never became visible: ${err.message.split('\n')[0]}`;
      }

      if (!navigationNote) {
        const hydrationOk = await page.waitForFunction(
          () => {
            const el = document.querySelector('.door-enter');
            return !!el && Object.keys(el).some((k) =>
              k.startsWith('__reactProps$') || k.startsWith('__reactFiber$'));
          },
          null,
          { timeout: clampWait(HYDRATION_TIMEOUT_MS), polling: 200 },
        ).then(() => true).catch(() => false);

        let attempts = 0;
        while (attempts < 5 && remaining() > 0) {
          attempts++;
          try {
            await enterButton.first().click({ timeout: clampWait(CLICK_TIMEOUT_MS) });
          } catch (err) {
            navigationNote = `click on "Enter the gallery" failed: ${err.message.split('\n')[0]}`;
            break;
          }
          const left = await page.waitForFunction(
            () => !document.querySelector('.door-enter'),
            null,
            { timeout: clampWait(DOOR_LEFT_TIMEOUT_MS), polling: 150 },
          ).then(() => true).catch(() => false);
          if (left) {
            navigationNote = `clicked "Enter the gallery" (attempt ${attempts}, hydrationSignal=${hydrationOk})`;
            clickAttempts = attempts;
            break;
          }
        }
        if (!navigationNote) {
          navigationNote = `clicked "Enter the gallery" ${attempts}x but the door never left (hydrationSignal=${hydrationOk})`;
          clickAttempts = attempts;
        }
      }
    }

    // --- ONE bounded wait on real DOM/computed-style conditions, stable samples ---
    while (Date.now() < deadline) {
      let snap = null;
      try {
        snap = await bounded(
          page.evaluate(readinessProbe, {
            mode: opts.view,
            frame: opts.view === 'artwork' ? opts.frame : -1,
            requestedUrl: targetUrl,
          }),
          clampWait(PROBE_TIMEOUT_MS),
          'readiness probe',
        );
      } catch (err) {
        snap = { ready: false, unmet: ['probe-failed'], conditions: {}, evidence: { probeError: String(err.message || err) } };
      }

      const key = JSON.stringify({ c: snap.conditions, e: snap.evidence });
      stable = key === previousKey ? stable + 1 : 1;
      previousKey = key;
      last = snap;

      const stageAncestor = (snap.evidence.ancestors || []).find((a) => a.filter && a.filter !== 'none') || null;
      samples.push({
        atMs: Date.now() - started,
        ready: snap.ready,
        stableCount: stable,
        unmet: snap.unmet,
        conditions: snap.conditions,
        // MuseumStage is the ancestor that carries opacity + blur(...)
        stageOpacity: stageAncestor ? stageAncestor.opacity : null,
        stageFilter: stageAncestor ? stageAncestor.filter : null,
        href: snap.evidence.href,
      });

      if (snap.ready && stable >= REQUIRED_STABLE_SAMPLES) {
        // --- capture, immediately, with the verified state still on screen ---
        let captureError = null;
        try {
          await page.screenshot({ path: pngPath, type: 'png', timeout: clampWait(SCREENSHOT_TIMEOUT_MS) });
        } catch (err) {
          captureError = err.message.split('\n')[0];
        }

        const after = await bounded(
          page.evaluate(readinessProbe, {
            mode: opts.view,
            frame: opts.view === 'artwork' ? opts.frame : -1,
            requestedUrl: targetUrl,
          }),
          clampWait(PROBE_TIMEOUT_MS),
          'post-capture probe',
        ).catch((err) => ({ ready: false, unmet: [`post-capture probe failed: ${err.message}`], conditions: {}, evidence: {} }));

        // "status: ok" means the capture is verifiable AFTER the shot, not merely that the
        // pre-shot sample looked ready: readiness held, a real WebGL renderer/context is
        // present, and nothing threw uncaught in the page. Console warnings stay in the
        // report but never fail a run.
        const verificationFailures = [];
        if (captureError) verificationFailures.push(`screenshot failed: ${captureError}`);
        if (!after.ready) {
          verificationFailures.push(`post-capture readiness lost: ${(after.unmet || []).join(', ') || 'unknown'}`);
        }
        if (!after.evidence.renderer) {
          verificationFailures.push(`no WebGL renderer available${after.evidence.glError ? ` (${after.evidence.glError})` : ''}`);
        } else if (after.evidence.glError) {
          verificationFailures.push(`WebGL context problem: ${after.evidence.glError}`);
        }
        if (after.evidence.contextLost) {
          verificationFailures.push('WebGL context reports itself lost (isContextLost() === true)');
        }
        if (recorder.state.pageErrors.length) {
          verificationFailures.push(`uncaught page error(s): ${recorder.state.pageErrors[0]}`);
        }

        const result = {
          status: verificationFailures.length ? 'error' : 'ok',
          reason: verificationFailures.length ? 'verification-failed' : null,
          view: opts.view,
          room: opts.view === 'artwork' ? opts.room : null,
          frame: opts.view === 'artwork' ? opts.frame : null,
          url: after.evidence.href || targetUrl,
          requestedUrl: targetUrl,
          viewport: DEFAULT_VIEWPORT,
          renderer: after.evidence.renderer,
          rendererSource: after.evidence.rendererSource,
          glError: after.evidence.glError,
          contextLost: after.evidence.contextLost,
          browserChannel,
          launchWarning,
          launchArgs,
          headless: !opts.headed,
          runId,
          capturedAt: new Date().toISOString(),
          elapsedMs: Date.now() - started,
          stableSamples: stable,
          requiredStableSamples: REQUIRED_STABLE_SAMPLES,
          pollIntervalMs: POLL_MS,
          timeoutMs: opts.timeout,
          readiness: after.conditions,
          verificationFailures,
          verification: {
            postCaptureReady: after.ready,
            postCaptureUnmet: after.unmet,
            rendererPresent: !!after.evidence.renderer,
            startTourStillPresent: after.evidence.startTourVisible,
            tourStarted: after.evidence.exitTourVisible,
            menuButtonLabel: after.evidence.menuButtonLabel,
            tourCounterText: after.evidence.tourCounterText,
            note: opts.view === 'entrance'
              ? 'The tour was never started: the capture is the entrance/overview with "Start the Tour" present.'
              : 'This mode opens /?room=&frame= directly, so the gallery itself starts the tour at that frame.',
          },
          evidence: after.evidence,
          samples: samples.slice(-MAX_KEPT_SAMPLES),
          sampleCount: samples.length,
          navigationNote,
          clickAttempts,
          ...recorder.snapshot(),
          files: {
            screenshot: pngPath,
            diagnosticScreenshot: verificationFailures.length ? pngPath : null,
            resultJson: jsonPath,
            runDir: outDir,
          },
        };
        writeJson(jsonPath, result);

        if (verificationFailures.length) {
          process.stderr.write(`FAILED: the capture could not be verified (${verificationFailures.length} problem(s))\n`);
          for (const f of verificationFailures) process.stderr.write(`  - ${f}\n`);
          process.stderr.write(`  png     : ${pngPath}\n`);
          process.stderr.write(`  json    : ${jsonPath}\n`);
          return EXIT_RUNTIME;
        }

        process.stdout.write(`OK ${opts.view} captured\n`);
        process.stdout.write(`  url      : ${result.url}\n`);
        process.stdout.write(`  renderer : ${result.renderer} (${result.rendererSource})\n`);
        process.stdout.write(`  png      : ${pngPath}\n`);
        process.stdout.write(`  json     : ${jsonPath}\n`);
        return EXIT_OK;
      }

      await page.waitForTimeout(POLL_MS);
    }

    // --- timeout: diagnostic screenshot + JSON, honest failure ---
    let timeoutPng = null;
    try {
      timeoutPng = path.resolve(outDir, `shot-timeout-${viewSlug}-${runId}.png`);
      // Bounded like every other screenshot, even though the budget is already spent.
      await page.screenshot({
        path: timeoutPng,
        type: 'png',
        timeout: DIAGNOSTIC_SCREENSHOT_TIMEOUT_MS,
      });
    } catch (shotErr) {
      timeoutPng = `screenshot failed: ${shotErr.message.split('\n')[0]}`;
    }

    const report = buildTimeoutReport({
      opts,
      runId,
      url: last && last.evidence ? last.evidence.href : targetUrl,
      recorder,
      samples: samples.slice(-MAX_KEPT_SAMPLES),
      lastSnapshot: last,
      unmet: last ? last.unmet : ['no-samples-collected'],
      extra: {
        browserChannel,
        launchWarning,
        launchArgs,
        headless: !opts.headed,
        sampleCount: samples.length,
        capturedAt: new Date().toISOString(),
        navigationNote,
        clickAttempts,
        files: {
          diagnosticScreenshot: timeoutPng,
          resultJson: jsonPath,
          runDir: outDir,
        },
      },
    });
    writeJson(jsonPath, report);

    process.stderr.write(`TIMEOUT: ${report.reason}\n`);
    process.stderr.write(`  url     : ${report.url}\n`);
    process.stderr.write(`  unmet   : ${(report.unmetConditions || []).join(', ') || 'n/a'}\n`);
    process.stderr.write(`  renderer: ${report.lastSnapshot ? report.lastSnapshot.renderer : 'unknown'}\n`);
    process.stderr.write(`  png     : ${timeoutPng}\n`);
    process.stderr.write(`  json    : ${jsonPath}\n`);
    return EXIT_TIMEOUT;
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    writeJson(jsonPath, {
      status: 'error',
      reason: 'runtime-failure',
      detail,
      view: opts.view,
      url: targetUrl,
      viewport: DEFAULT_VIEWPORT,
      runId,
      browserChannel,
      launchWarning,
      collected: recorder.snapshot(),
    });
    process.stderr.write(`ERROR: runtime failure: ${detail}\nEvidence: ${jsonPath}\n`);
    return EXIT_RUNTIME;
  } finally {
    // Always close the browser, whatever happened.
    try { if (context) await context.close(); } catch { /* ignore */ }
    try { if (browser) await browser.close(); } catch { /* ignore */ }
  }
}

main()
  .then((code) => { process.exitCode = code; })
  .catch((err) => {
    process.stderr.write(`ERROR: uncaught: ${err && err.stack ? err.stack : err}\n`);
    process.exitCode = EXIT_RUNTIME;
  });

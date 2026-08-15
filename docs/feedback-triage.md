# Feedback Triage — Collaborator Suggestions

Every suggestion, mapped point by point. Judged against the project's non-negotiables:
energy-first accessibility as the value prop · on rails · all UI as HTML over the canvas ·
performance budget (old mid-range Android) · a *sustainable* pace for two maintainers with ME/CFS
(perpetual moderation is a risk, not a feature) · already out of scope: accounts, comments/likes,
databases.

**Sorting axis:** does it live **on the device** (`localStorage` — free, works with the current
static export) or does it need a **backend** (the Phase 2 pivot)?

**Decision:** ✔️ already there/decided · ✅ adopt · 🟡 yes, later / with nuance · 🔴 out for now · 🗣️ discuss with you
**Build effort:** 🟢 low · 🟡 medium · 🔴 high

---

## Master table

| # | Suggestion | Decision | Effort | Current implementation | Notes |
|---|---|:--:|:--:|---|---|
| 1 | Dark mode by default | ✅ | 🟢 | **Partial:** default dark, persisted toggle; door, artwork/submit modals, list view, and admin login now themed; light-mode text tones retinted to match the warm palette instead of neutral gray | Light-mode scope still open for hamburger/HUD; landing redesign will need polish |
| 2 | Big simple buttons | ✔️ | 🟢 | Present in primary tour/menu controls | Keep as baseline |
| 3 | Soft music, off by default | ✔️ | 🟡 | Not built | Decided for Phase 3; never autoplay |
| 4 | Slower, gentler motion | ✔️ | 🟢 | `prefers-reduced-motion` baseline + slower camera/chrome timing | Continue tuning by feel |
| 5 | Readable text | 🟡 | 🟢 | Baseline typography/contrast in current UI; list view uses real HTML text (fully readable/zoomable). **Open:** the in-scene 3D plaque (`components/museum/Frame.tsx`, `createPlaqueTexture`) is a small canvas-drawn texture — title/artist, centered, with a bare `'...'` as the only "there's more" hint before tapping into the full `ArtworkInfoModal` | Next: try a bigger plaque font size first (`PLAQUE_TEXTURE_WIDTH`/`_HEIGHT` + the `drawFittedText` sizes in `Frame.tsx`); if still cramped, revisit what it shows and replace the bare `'...'` with an explicit "Tap to read more" |
| 6 | Simple interface | ✔️ | 🟢 | Minimal tour controls + drawer | Keep resisting extra chrome |
| 7 | Saves where you left off | ✔️ | 🟢 | Implemented device-local resume: `roomId` + `frameIndex` | = #18 |
| 8 | Design variation by room / piece | ✅ | 🟡 | Room atmosphere is data-driven via `RoomTheme` | Future: richer theme kit, no handmade rooms |
| 9 | Randomize artwork / room order | 🗣️ | 🟡 | Not built | See **Discussion A**; pairs with resume-by-ID |
| 10a | Optional artist audio commentary | ✅ | 🟡 | **Done:** approved artworks can have generated narration or manually uploaded artist audio; plaque play button appears only when audio exists | Generated TTS is best-effort and never blocks approval. Admin can generate, upload, remove, and re-generate audio from Manage. Visitor label distinguishes generated voice from artist audio |
| 10b | Animated 3D artist avatar beside piece | 🔴 | 🔴 | Not built | Out for perf/cognitive load |
| 10c | Guided tour mode (auto-navigate + narrate) | 🟡 | 🟡 | Not built | George's preferred take on the avatar idea: one tour guide voice auto-advancing through frames, instead of a 3D avatar per piece. Complements 10a rather than replacing it — 10a is opt-in per piece during manual browsing, 10c is a separate hands-off mode; would need an explicit "start guided tour" entry point and a way to interrupt/exit back to manual control. Can reuse the same audio assets if we build 10a first |
| 11 | Guest book / comments / mini-blog | 🗣️ | 🔴 | Not built | See **Discussion B**; backend + moderation risk |
| 12 | Decent contrast | ✔️ | 🟢 | Baseline contrast in dark UI; themed modals use tokens | Re-check if hamburger/HUD get light mode |
| 13 | Hide interface / just swipe through | ✔️ | 🟢 | Implemented via Eye-off button; hidden mode supports swipe nav, down to overview, up back to last frame | = #16 |
| 14 | Vertical-first, identical on wide screens | ✅ | 🟡 | Partially supported by responsive UI/camera framing | Needs explicit cross-viewport QA pass |
| 15 | Distress / content tags | ✅ | 🟢 | **Done:** submit form collects optional content notes; approval shows artist-selected notes read-only; Manage can edit them; plaque displays them | Stored as `contentNotes?: string[]` from a closed list in `config/contentNotes.ts`. They are deliberately excluded from generated audio narration and from My Shelf |
| 16 | "Sit with this work" (hide all but the piece) | ✔️ | 🟢 | Implemented as quiet hide-interface mode | Text not exposed literally in UI |
| 17 | Sit on the bench to rest / take the room in | ✅ | 🟡 | **Prototype:** two tappable benches move camera to a seated rest view with minimal rest UI + fixed-position look controls; controls menu mentions bench tap/click | Bench transition has been slowed to match the calmer artwork-to-artwork pacing. Still needs an HTML action before accessible-complete |
| 18 | Track where you are / left off | ✔️ | 🟢 | Implemented device-local resume: `roomId` + `frameIndex` | = #7 |
| 19 | Artist profiles | 🟡 | 🟡 | Not built | Read-only artist page later; self-managed profiles stay out |
| 20 | "Blind" fully-audio experience | 🟡 | 🔴 | Not built | List view (#30) is the screen-reader-friendly foundation this was waiting on; recorded narration = 10a. A dedicated fully-audio mode is still not built |
| 21 | Short and long descriptions | ✔️ | 🟢 | **Done:** `shortDescription`/`longDescription` on `ImageMetadata`, submit form, and plaque | — |
| 22 | Visual-media vs written rooms | 🟡 | 🟡 | Not built | Good fit, but changes artwork model |
| 23 | ⭐ Visit presets (low energy / gentle / full / custom) | ✔️ | 🟡 | **Done (as Guided / Silent / At your own pace):** `TourEntryModal.tsx` offers this choice on entering a room; each maps to narration + dwell-seconds; the pick persists to `localStorage` (`VISIT_MODE_KEY`) and returning visitors get a "Welcome back" resume option instead of the doors | Not literally labelled "low energy/gentle/full/custom" — Silent≈low-energy, Guided≈full, Own-pace≈custom. No separate visual/motion-intensity preset; revisit labels if George's exact wording matters |
| 24 | "Add to my shelf" — private favourites | ✔️ | 🟡 | **Done:** `ShelfContext`, heart button on plaque, "My shelf" section in hamburger menu, stable IDs (incl. static placeholders) | Device-local only. My Shelf hides Rooms/Appearance/Controls while open; it does not show content notes |
| 25 | Landing = the front door to the gallery | ✔️ | 🟢 | Current app starts at the door; the door now also links straight to the list view (#30) without loading the 3D bundle | Future landing redesign likely |
| 26 | Time estimation for the visit | ✔️ | 🟢 | **Done:** `utils/tourEstimate.ts` (`estimateRoomSeconds`/`formatEstimate`) shows a deliberately vague "about X min" per preset in `TourEntryModal` before you start | Only shown up front, per room — no running "time left" during the visit; that's the remaining reframe idea: "how much is left, at your pace" |
| 27 | Manage approved artworks | ✅ | 🟡 | **Done:** Approved rows have a Manage modal for metadata, descriptions, content notes, room/slot, image preview, delete, audio playback/generate/upload/remove | Slot dropdown disables occupied slots; Approved lists artworks in slot order per room. Admin cards intentionally stay dense and do not show content-note badges |
| 28 | Audio provider/settings management | ✅ | 🟡 | **Done:** Settings has ElevenLabs config in accordions; Developer can switch/test provider (`elevenlabs`, `local`, `openai`, `disabled`) | ElevenLabs supports four API-key slots and tries them in order. Voice dropdown loads server-side via `GET /v2/voices`, with `/v1/voices/search` as fallback |
| 29 | Developer test fixtures | ✅ | 🟢 | **Done:** dev-only tab can reset Room I with template approved artworks | Requires Basic Auth role `dev`; regular `admin` cannot see Developer tab or call developer endpoints |
| 30 | ⭐ Accessible list view (plain HTML alternative) | ✅ | 🟡 | **Done:** `/list` — a Server Component reading the same room/artwork catalog as the 3D gallery (`utils/roomArtworks.ts`), rendered as a flat, real-HTML, screen-reader/keyboard-navigable list. No Three.js in that route at all. Reachable from the door and from the hamburger menu (Appearance section) | This was `AGENTS.md`'s "biggest open gap" (principle 6). Reuses the same `SubmitArtworkModal` and the same pinch/zoom `ArtworkLightbox` as the 3D gallery — no separate components to keep in sync. Each artwork links back into the exact 3D frame (`/?room=&frame=`). Doesn't (yet) narrate itself — see #20 |

**Free & possible now** (device-local): 17 (prototype, still needs an HTML action before accessible-complete). 23 and 24 are now done.
**Backend-backed features now present:** submissions/moderation, approved artwork storage, generated/uploaded audio, content notes, admin settings.
**Still grouped with future backend/moderation decisions:** read-only artist pages (19), any guest book (11).

---

## Implementation notes for future agents

- **Content notes:** use the closed list in `config/contentNotes.ts`. Public submit owns first selection; approval only displays the artist's selected notes; Manage can edit after approval. Do not add notes to audio narration unless the product decision changes.
- **Audio narration:** `utils/audioNarrationText.ts` is the single text/signature builder for generated audio. Audio is marked outdated when the current narration text signature differs from the stored `audioTextSignature`.
- **ElevenLabs:** stable config lives in Settings, not Developer. Developer is for provider testing. Voices are loaded server-side; use `GET /v2/voices` first, with `/v1/voices/search?page_size=100` as fallback. Do not expose API keys to the client.
- **Storage:** approved artwork mutations must continue through `lib/storage.ts`; Blob reads may be stale, so preserve reducer stale-read guards and storage locks.

---

## Discussion A — Randomized order (fair exposure)

The tension: randomizing only breaks "resume where you left off" **if the order changes between
visits**. Fix = separate the two concerns: *rotate the emphasis* and *anchor resume to the
artwork's ID, not its position*.

| Approach | How it works | Fair exposure | Resume works? | SR-stable | Effort |
|---|---|:--:|:--:|:--:|:--:|
| A. Fixed curated order | Curator sets the order | Low | ✅ | ✅ | 🟢 |
| **B. Rotating "featured"** | Fixed order; N pieces featured, rotated per deploy/week | Med–high | ✅ | ✅ | 🟢 |
| C. Per-visitor seed | Random order fixed in `localStorage` on first visit | High | ✅ (that device) | ✅ | 🟡 |
| D. Per-session random | Reshuffles every visit | Max | ❌ | ⚠️ | 🟡 |
| **E. Resume by artwork ID** | Store last artwork's ID; order can rotate, still returns you to it | High | ✅ | ✅ | 🟡 |

**Proposal: B + E.** Order rotates (fairness); resume takes you to the last *piece* you saw even
if it moved. "Featured" in practice (curator-driven, no backend): a discreet *"Featured this week"*
plaque label, a slightly warmer spotlight, or a wall of honour in the lobby.

George's suggestion adds a concrete mechanism: a **"Featured art" entry in the hamburger menu**
that jumps straight to the current rotating pick (the daily/weekly feature), rather than relying
on visitors to notice it while walking through. Cheap to add on top of B — same data, one more nav
entry.

## Discussion B — Guest book / comments

Clash: excludes comments/social + DB, and — above all — **moderation is perpetual work two sick
maintainers can't sustain** (+ abuse). The *intent* (the artist feeling warmth) is legitimate.

| Option | What it is | Cost / moderation |
|---|---|:--:|
| A. Nothing public | Just the piece and its plaque | 🟢 None |
| **B. Private "note to the artist"** | Goes to curator/artist, not published | 🟢 No public moderation |
| **C. Preset non-text reactions** | Fixed emojis/states, no free text | 🟢 Little room for abuse |
| D. Moderated guest book per exhibition | Public wall, reviewed before publishing | 🔴 Continuous moderation |

**Middle ground: B or C** — dignified without the moderation load. D only if we both co-moderate.

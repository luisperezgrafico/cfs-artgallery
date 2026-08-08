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
| 1 | Dark mode by default | ✅ | 🟢 | **Partial:** default dark, persisted toggle, door + artwork/submit modals themed | Light-mode scope still open for hamburger/HUD; landing redesign will need polish |
| 2 | Big simple buttons | ✔️ | 🟢 | Present in primary tour/menu controls | Keep as baseline |
| 3 | Soft music, off by default | ✔️ | 🟡 | Not built | Decided for Phase 3; never autoplay |
| 4 | Slower, gentler motion | ✔️ | 🟢 | `prefers-reduced-motion` baseline + slower camera/chrome timing | Continue tuning by feel |
| 5 | Readable text | ✔️ | 🟢 | Baseline typography/contrast in current UI; 3D plaques render as stable canvas textures | Keep validating on mobile |
| 6 | Simple interface | ✔️ | 🟢 | Minimal tour controls + drawer | Keep resisting extra chrome |
| 7 | Saves where you left off | ✔️ | 🟢 | Implemented device-local resume: `roomId` + `frameIndex` | = #18 |
| 8 | Design variation by room / piece | ✅ | 🟡 | Room atmosphere is data-driven via `RoomTheme` | Future: richer theme kit, no handmade rooms |
| 9 | Randomize artwork / room order | 🗣️ | 🟡 | Not built | See **Discussion A**; pairs with resume-by-ID |
| 10a | Optional artist audio commentary | 🟡 | 🟡 | Not built | Artist voice + TTS fallback later, off by default. Standalone feature: a play button near the plaque/description, listen at your own pace during manual browsing |
| 10b | Animated 3D artist avatar beside piece | 🔴 | 🔴 | Not built | Out for perf/cognitive load |
| 10c | Guided tour mode (auto-navigate + narrate) | 🟡 | 🟡 | Not built | George's preferred take on the avatar idea: one tour guide voice auto-advancing through frames, instead of a 3D avatar per piece. Complements 10a rather than replacing it — 10a is opt-in per piece during manual browsing, 10c is a separate hands-off mode; would need an explicit "start guided tour" entry point and a way to interrupt/exit back to manual control. Can reuse the same audio assets if we build 10a first |
| 11 | Guest book / comments / mini-blog | 🗣️ | 🔴 | Not built | See **Discussion B**; backend + moderation risk |
| 12 | Decent contrast | ✔️ | 🟢 | Baseline contrast in dark UI; themed modals use tokens | Re-check if hamburger/HUD get light mode |
| 13 | Hide interface / just swipe through | ✔️ | 🟢 | Implemented via Eye-off button; hidden mode supports swipe nav, down to overview, up back to last frame | = #16 |
| 14 | Vertical-first, identical on wide screens | ✅ | 🟡 | Partially supported by responsive UI/camera framing | Needs explicit cross-viewport QA pass |
| 15 | Distress / content tags | ✅ | 🟢 | Not built | Needs small curation policy first |
| 16 | "Sit with this work" (hide all but the piece) | ✔️ | 🟢 | Implemented as quiet hide-interface mode | Text not exposed literally in UI |
| 17 | Sit on the bench to rest / take the room in | ✅ | 🟡 | **Prototype:** two tappable benches move camera to a seated rest view with minimal rest UI + fixed-position look controls; controls menu mentions bench tap/click | Still needs an HTML action before accessible-complete |
| 18 | Track where you are / left off | ✔️ | 🟢 | Implemented device-local resume: `roomId` + `frameIndex` | = #7 |
| 19 | Artist profiles | 🟡 | 🟡 | Not built | Read-only artist page later; self-managed profiles stay out |
| 20 | "Blind" fully-audio experience | 🟡 | 🔴 | Not built | Screen-reader + list view first; recorded narration = 10a |
| 21 | Short and long descriptions | ✔️ | 🟢 | **Done:** `shortDescription`/`longDescription` on `ImageMetadata`, submit form, and plaque | — |
| 22 | Visual-media vs written rooms | 🟡 | 🟡 | Not built | Good fit, but changes artwork model |
| 23 | ⭐ Visit presets (low energy / gentle / full / custom) | ✅ | 🟡 | Not built | Saved to device; extends comfort controls |
| 24 | "Add to my shelf" — private favourites | ✔️ | 🟡 | **Done:** `ShelfContext`, heart button on plaque, "My shelf" section in hamburger menu, stable IDs (incl. static placeholders) | Can be improved |
| 25 | Landing = the front door to the gallery | ✔️ | 🟢 | Current app starts at the door | Future landing redesign likely |
| 26 | Time estimation for the visit | ✅ | 🟢 | Not built | Reframe: "how much is left, at your pace" |

**Free & possible now** (device-local): 17, 23, 24 + descriptions/tags.
**Groups with the Phase 2 backend:** read-only artist pages (19), any guest book (11).

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

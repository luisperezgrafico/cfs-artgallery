# Feedback Triage — Collaborator Suggestions

Every suggestion, mapped point by point. Judged against the project's non-negotiables (`SCOPE.md`):
energy-first accessibility as the value prop · on rails · all UI as HTML over the canvas ·
performance budget (old mid-range Android) · a *sustainable* pace for two maintainers with ME/CFS
(perpetual moderation is a risk, not a feature) · already out of scope: accounts, comments/likes,
databases.

**Sorting axis:** does it live **on the device** (`localStorage` — free, works with the current
static export) or does it need a **backend** (the Phase 2 pivot)?

**Status:** ✔️ already there/decided · ✅ adopt · 🟡 yes, later / with nuance · 🔴 out for now · 🗣️ discuss with you
**Build effort:** 🟢 low · 🟡 medium · 🔴 high

---

## Master table

| # | Suggestion | Status | Effort | Note |
|---|---|:--:|:--:|---|
| 1 | Dark mode by default | ✅ | 🟢 | Rooms/scene already dark; the **beige landing** still needs it |
| 2 | Big simple buttons | ✔️ | 🟢 | Core design language |
| 3 | Soft music, off by default | ✔️ | 🟡 | Decided (Phase 3); never autoplay |
| 4 | Slower, gentler motion | ✔️ | 🟢 | `prefers-reduced-motion` done; tuning left |
| 5 | Readable text | ✔️ | 🟢 | Baseline |
| 6 | Simple interface | ✔️ | 🟢 | Baseline |
| 7 | Saves where you left off | ✔️ | 🟢 | Implemented device-local resume: `roomId` + `frameIndex` · = #18 |
| 8 | Design variation by room / piece | ✅ | 🟡 | Via a **data-driven theme kit** — no handmade rooms (perf + "system, not rooms") |
| 9 | Randomize artwork / room order | 🗣️ | 🟡 | See **Discussion A** — pairs with resume-by-ID |
| 10a | Optional artist audio commentary | 🟡 | 🟡 | Artist's own voice **+ TTS fallback**, off by default (later) |
| 10b | Animated 3D artist avatar beside piece | 🔴 | 🔴 | Breaks perf budget; the audio (10a) covers the need |
| 11 | Guest book / comments / mini-blog | 🗣️ | 🔴 | See **Discussion B** — backend + perpetual moderation |
| 12 | Decent contrast | ✔️ | 🟢 | Baseline |
| 13 | Hide interface / just swipe through | ✔️ | 🟢 | Implemented as an Eye-off button in the tour controls · = #16 |
| 14 | Vertical-first, identical on wide screens | ✅ | 🟡 | Responsive accessibility guarantee |
| 15 | Distress / content tags | ✅ | 🟢 | Needs a small curation policy (what's tagged, how revealed) |
| 16 | "Sit with this work" (hide all but the piece) | ✔️ | 🟢 | Implemented as quiet hide-interface mode · = #13 |
| 17 | Sit on the bench to rest / take the room in | ✅ | 🟡 | A calm "rest" viewpoint on rails — very on-theme |
| 18 | Track where you are / left off | ✔️ | 🟢 | Implemented device-local resume: `roomId` + `frameIndex` · = #7 |
| 19 | Artist profiles | 🟡 | 🟡 | **Read-only** artist page later; self-managed profiles stay out |
| 20 | "Blind" fully-audio experience | 🟡 | 🔴 | Screen-reader + list-view **first**; recorded narration = 10a |
| 21 | Short and long descriptions | ✅ | 🟢 | One extra metadata field |
| 22 | Visual-media vs written rooms | 🟡 | 🟡 | Good fit for the community; changes "artwork = text" model (later) |
| 23 | ⭐ Visit presets (low energy / gentle / full / custom) | ✅ | 🟡 | Saved to device — the standout; extends the existing comfort controls |
| 24 | "Add to my shelf" — private favourites | ✅ | 🟡 | Device-local, no account, non-social |
| 25 | Landing = the front door to the gallery | ✔️ | 🟢 | Already the door |
| 26 | Time estimation for the visit | ✅ | 🟢 | Reframe: *"how much is left, at your pace"* — not "completion" |

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

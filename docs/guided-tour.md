# Guided Tour, Visit Modes & Time Estimates — implementation spec

**Status:** decided, not built. Everything below is settled unless marked *open*.

Covers four triage entries that turned out to be one design: **#10c** (guided tour), **#23** (visit
presets), **#26** (time estimation) and the missing home for **#17** (bench). It also closes a real
gap in **#15**: content notes are currently only visible inside the plaque modal, which a guided
visitor never opens.

---

## 1. The core model: two booleans, not modes

Do **not** model `mode: 'guided' | 'manual'`. There are two independent pieces of state:

| State | Meaning |
|---|---|
| `autoAdvance` | Does the gallery move to the next artwork by itself? |
| `narrationEnabled` | Does audio narration play on arrival? |

"Manual mode" is simply `autoAdvance = false`. There are no two flows to maintain and no mode
transitions to test. Everything in this document is a consequence of these two booleans.

The four combinations are all meaningful, but only **three need a door** — because in manual mode
narration is already on demand (you press play on the plaque), so "manual with voice" and "manual
without voice" are the same door.

|  | Narration on | Narration off |
|---|---|---|
| **Auto-advance** | Guided | Silent |
| **Manual** | *At your own pace* (voice is opt-in per artwork) | |

---

## 2. Entry modal — three doors

Shown when the visitor presses **Start the Tour**. Three large options, each with a subtitle stating
literally what will happen:

- **Guided** — *Moves on its own, with narration.*
- **Silent** — *Moves on its own, no voice.*
- **At your own pace** — *You move. Narration on any piece, if you want it.*

Below, small: *You can change this at any time.*

Each door carries its room time estimate (see §7).

**The modal is the gate for every new browser session.** It is also the user gesture browsers
require before audio may play, so guided narration never violates principle #5 (no autoplay) —
the visitor asked for it.

Once a choice has been made before, the modal leads with it: *Last time: Guided* → **[Continue]**
· **[Change]**. Asking someone with brain fog to re-assess their energy on every visit is itself work.

---

## 3. Transport controls

One surface only — the existing `TourControls` pill at bottom centre. It does not grow; its
**contents change with state**.

```
[◀]   ( Auto | Manual )   [▶]   [👁️]   [✕]
```

- **`Auto | Manual` is a segmented control**, both options visible, the active one marked. Not a
  single button labelled with its own state — that is ambiguous ("am I in Auto, or does tapping
  put me in Auto?").
- It shows **state, not an action**. This matters: after returning from a plaque or a zoomed
  artwork you can see where you are instead of reconstructing it. It also reads correctly for
  someone who never started a tour, where "Resume" would be nonsense.
- **The arrows are always present, in both states.** This follows directly from §5: if we warn that
  the next artwork carries content notes, the visitor must be able to skip it without leaving the tour.

**The artwork counter moves** out of the pill into the existing secondary line beneath it:

```
3 / 8 · ← → to navigate
```

### Taking control never destroys anything

Swiping, tapping an artwork, or opening a plaque switches to **Manual**. It never exits the tour and
never resets position. Returning to **Auto** is one tap on the same segmented control. A stray tap
from someone holding a phone in bed must be cheap to undo.

---

## 4. What drives advancement

| Condition | Advance trigger |
|---|---|
| Narration playing | Audio ends, then a short beat |
| No narration (Silent, or muted) | Dwell timer — **20 s default** |

- Never auto-advance while a modal, the plaque or the lightbox is open.
- Never auto-advance **across rooms**. A room ends and waits (see §8). A tour that walks itself from
  room to room would be autoplay in spirit.
- A hidden tab (`visibilitychange`) **suspends** the timer and audio; it does not change
  `Auto | Manual`. Lock your phone, come back, continue where you were.
- Muting mid-artwork removes the "audio ended" trigger — that artwork and the ones after fall back
  to the dwell timer. Do not let the tour stall here.

---

## 5. The now-playing strip (content notes + narration)

One strip, at the **top**, above the artwork — reading order. It is a container with **two
independent halves**, each with its own condition:

| Artwork | Narration active | Strip shows |
|---|---|---|
| Has content notes | Yes | Notes text + 🔊 icon |
| Has content notes | No | Notes text only |
| No content notes | Yes | 🔊 icon only |
| No content notes | No | **Nothing — no strip** |

The plain narration case is **an icon only, no label**. There is no "narration is active" message.

### Timing

- Appears **on arrival**, before the voice starts.
- Artwork **with** content notes: narration waits **~3 s**. That gap is the whole point — it is the
  room to read the notes and skip with the arrow if you want to.
- Artwork **without** notes: normal short beat.
- The strip stays **while the voice is speaking** and fades shortly after it ends. With no voice, it
  fades after a few seconds.

One rule: *visible from arrival until shortly after the narration ends.* The mute control exists
exactly as long as the thing it mutes.

### Why not a consent modal

We deliberately rejected "the next artwork has these notes — continue?". It is blocking, it demands a
decision inside the mode chosen to avoid decisions, it turns a visit with several tagged works into a
sequence of consent dialogs, and it would require an internal "severe" tier of notes — ongoing
curation work, and a hierarchy the community itself may object to.

**Warn and give time to react, don't ask permission.**

Note this is coupled to the existing decision to keep content notes out of the generated narration
(they stay out — the audio is the artwork's voice, not admin metadata). That decision assumed someone
would read them on the plaque; this strip is what makes it hold in guided mode.

---

## 6. Narration toggle semantics

The 🔊 in the strip and the switch in the side menu are **the same single piece of state** — the
`ThemeToggle` pattern: two mount points, never both at once, no shared state of their own.

Tapping 🔊:

1. Stops the current voice immediately.
2. The strip **does not disappear** — it becomes `Narration off · Turn back on` and stays a few seconds.
3. Ignore it and it fades; you are in silence from here on.
4. Tap the undo and you are back.

After that window, narration stays off artwork after artwork **and across sessions**, until
re-enabled in the side menu — or by picking **Guided** in the entry modal next time.

The asymmetry is intentional: **turning the stimulation down is immediate, turning it back up is
deliberate.** The undo window exists only so an accidental tap is not a one-way door.

> **The governing rule:** presets set the toggles · toggles persist · picking a door again resets
> them to that door's defaults.

Muting does **not** switch you to Manual. You stay in Auto with narration off — the segmented control
still reads Auto, because that is what you are doing.

---

## 7. Time estimates

**Per room. Never global. Never a running counter, timer or progress bar** — a number counting down
turns a visit into a task, which is the opposite of the point.

Shown only where a decision is being made:

- in the entry modal, next to each door — *"Guided — about 12 min"*;
- at the end of a room, on the next-room button — *"Next room — about 6 min"*.

Always vague on purpose: *"about 6 minutes"*, never `6:24`.

### Computing it

Deterministic: `Σ audio durations + (dwell × artworks without audio) + transitions`.

**Known gap:** audio duration is not stored today. Add `audioDurationSec` to `ImageMetadata`, written
when audio is generated or uploaded (`lib/audioNarration.ts` and the upload route).

**Fallback, and what makes this work with no audio at all:** estimate from the narration text that
`utils/audioNarrationText.ts` already builds — roughly **2.5 words per second**. So the feature ships
before there is a single real recording, and simply gets more accurate as audio arrives.

---

## 8. End of a room → the bench

This is where #17 finally has a purpose.

- After the last artwork the camera **drifts to the bench by itself** and settles into the seated
  rest view. Respect `prefers-reduced-motion`: crossfade instead of moving.
- **No modal.** Two buttons at the bottom, over the free-look rest view:
  - **Next room — about 6 min**
  - the existing exit button (*Back to Gallery* / *End visit*)
- **"Stay seated" is not a button.** It is what happens if you do nothing, and that absence of
  pressure is the feature.

Tapping **Next room** *is* the consent gesture, so the next room starts straight away in the mode you
were in, toggles preserved. No second modal.

---

## 9. Persistence

One new versioned key in `utils/userPreferences.ts`, alongside visit position, menu tab Y and shelf:

```
cfs-gallery:visit-mode:v1   →   { autoAdvance, narrationEnabled, dwellSeconds, updatedAt }
```

Same rules as the rest: per device, no accounts, wrapped in `try/catch`, silent fallback to defaults
when storage is unavailable.

Combined with the existing visit-position resume, returning state is *room + artwork + how you visit*.
A new session still passes through the entry modal (§2) — it must, for the audio gesture.

---

## 10. Side menu — new collapsed section

A collapsible section next to *Appearance* and *Controls*:

- **Narration** — on/off (the same state as the strip's 🔊).
- **Time per artwork** — **three values, not a numeric field**: 10 / 20 / 40 s, default 20.
  A free number input makes you think; three buttons don't.

*Open:* 20 s is a starting guess. It will probably feel short on large works and long on small ones —
only a real phone will tell.

---

## 11. Architecture notes

- `utils/useAudioPlayer.ts` is per-component by design. Guided narration needs playback **lifted into
  a context**, because "audio ended" is what advances the tour.
- Suggested shape: a `GuidedTourProvider` nested inside the existing `TourProvider`, owning
  `autoAdvance`, `narrationEnabled`, the audio element and the dwell timer, and calling `nextFrame()`
  from `useTour()`. This keeps `TourContext` from growing into a second god object.
- All of it stays HTML over the canvas (principle #2).

---

## 12. Build order

Each step is usable and testable on its own. Nothing here needs real audio to begin.

1. **`autoAdvance` + the `Auto | Manual` segmented control**, on top of today's manual tour, with the
   dwell timer. Counter moves to the secondary line. Testable with zero audio and no modal.
2. **The now-playing strip** — content notes, the lead-in gap, the 🔊 with its undo window.
3. **Entry modal** with the three doors, plus persistence (§9) and the menu section (§10).
4. **Time estimates** — `audioDurationSec` + the word-count fallback.
5. **End of room → bench**, with the two buttons.

---

## 13. Deliberately rejected

Recorded so they don't get re-proposed as improvements:

- A **consent modal** before artworks with content notes (§5).
- An internal **"severe" tier** of content notes.
- A **fourth door** for manual-without-voice — manual narration is already opt-in.
- **Global** time estimate, running countdown, or progress bar.
- **Auto-advancing between rooms.**
- Presets named by **energy level** ("low / medium / full") — they force self-assessment and age badly.
- **"Custom"** as a door; fine-grained settings live in the menu.
- A **free numeric input** for dwell time.
- A **"stay seated"** button.

---

## 14. Deferred

- **Screen readers.** Auto-advance must not steal focus; announce changes via a polite `aria-live`
  region. Being handled together with the accessible list view rather than here.
- **This does not replace the list view (#6).** They resemble each other — both are "don't make me
  work" — but the list serves reading, scanning, skipping and working without 3D. It remains the
  biggest open item.

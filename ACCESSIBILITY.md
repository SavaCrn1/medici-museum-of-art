# Accessibility findings and what was done

Audited against the live site at <https://www.medicimuseum.art/> on 1 September 2026.
Every finding below was measured in the page, not assumed. WCAG references are to 2.2 Level AA.

---

## 1. Contact information

### 1.1 The phone number could not be called — *fixed*

`(330) 856-2120` appeared as plain text in the footer of every page. There were **zero**
`tel:` links on the entire site.

> Measured: `document.querySelectorAll('a[href^="tel:"]').length` → `0`

On a phone, the single most common thing a visitor wants to do — call the museum — required
selecting and copying text. Switch-access and voice-control users had no way to trigger a call
at all.

**Now:** every appearance of the number is `<a href="tel:+13308562120">`, in E.164 so it dials
correctly from any country or dialler. The number is still shown in the familiar
`(330) 856-2120` form.

### 1.2 The email link went somewhere other than what it said — *fixed*

The footer link read `info@medicimuseum.art`. Its actual destination was:

```
mailto:katelyn.russo@medicimuseum.art?cc=alex.jesko%40medicimuseum.art
```

Two problems. First, this fails **WCAG 2.5.3 Label in Name** — a voice-control user saying
"click info at medicimuseum dot art" activates a link that does something else, and a screen
reader user is told one address while their mail client is handed another. Second, it published
two named staff members' personal work addresses in the page source of every page, where
scrapers collect them.

There was also a **second, empty** mailto link pointing at the same address with no accessible
name at all.

**Now:** one link, `info@medicimuseum.art`, whose visible text and `href` are the same string.
The nameless duplicate is gone.

> **Action needed from the museum:** confirm `info@medicimuseum.art` is a real, monitored
> mailbox. If it is an alias, point it at whoever should receive enquiries. If it does not
> exist, change `site.email` in `src/site.config.js` — but please use a role address rather
> than a personal one.

### 1.3 The address was not marked up and had no directions link — *fixed*

The address rendered as a bare text block. The accessibility tree read it as one run-together
string:

> `"9350 East Market St.Warren, OH 44484"`

There was no `<address>` element, no `maps` link anywhere on the site (`0` matches), and no way
to get directions without retyping the address into another app. The museum's own *event*
pages already link to a map — the main site never did.

**Now:** a real `<address>` element, plus a "Get directions" link to the same Google Maps query
the museum's event pages already use, so it drops the same pin. The link's accessible name
includes the full address, so it is unambiguous when read out of context.

### 1.4 Opening hours contradicted themselves — *fixed, needs your confirmation*

The site published two different answers to "when are you open":

| Where | What it said |
|---|---|
| Footer (every page) | **Thursday** – Sunday, 11am – 4pm |
| `/visit` page body | **Wednesday** – Sunday, 11am – 4pm |
| `/tours` page body | Tours offered **Wednesday** through Sunday |

A visitor planning a Wednesday trip got a different answer depending on which page they landed
on. For anyone who has to plan travel carefully — arranging a lift, paid transport, a carer,
or a limited-energy day — a wrong answer here is a wasted journey.

**Now:** hours live in exactly one place (`src/site.config.js`) and every page renders from it,
so they cannot drift apart again. They are marked up as a real table with day-name row headers,
today's row is highlighted *and* labelled "(today)" in text, and an "Open now / Closed right
now" line is computed in the museum's own timezone rather than the visitor's.

> **Action needed from the museum:** the rebuild uses **Wednesday – Sunday**, because two pages
> said so and one said otherwise. If Thursday is correct, change `hours.days` in
> `src/site.config.js` to `[4, 5, 6, 0]`. This is a one-line change that updates the whole site.

---

## 2. The events calendar

The old calendar is a Squarespace YUI widget. Measured against the live DOM:

### 2.1 It could not be reached by keyboard at all — *fixed*

Every single day cell carried `tabindex="-1"`:

```html
<td class="calendar_col6 yui3-calendar-day today" role="gridcell" tabindex="-1" ...>
```

With no cell at `tabindex="0"` and no key handling, there was no way in. A keyboard-only or
switch user could not read a single date.

**Now:** a standard grid with roving tabindex — one cell in the tab order, then arrow keys move
day by day and week by week, Home/End jump to the start and end of the week, Page Up / Page Down
change month, and Enter opens the event on that day. Month boundaries roll over correctly
(pressing ↑ on 1 January moves to 25 December of the previous year).

Verified by dispatching real key events and reading `document.activeElement` after each:

```
start      -> Thursday, January 1, 2026
ArrowRight -> Friday, January 2, 2026
ArrowDown  -> Friday, January 9, 2026
Home       -> Sunday, January 4, 2026 ... 1 event: Drawing With Scissors at 2pm
End        -> Saturday, January 10, 2026 ... 1 event: Storytime at the Art Museum at 10am
PageDown   -> Sunday, February 1, 2026     | month February 2026
PageUp     -> Thursday, January 1, 2026    | month January 2026
ArrowUp    -> Thursday, December 25, 2025  | month December 2025
```

### 2.2 Dates had no accessible names — *fixed*

A day cell contained only this:

```html
<div class="marker"><div class="marker-dayname">Tue</div><div class="marker-daynum">1</div></div>
```

A screen reader announced `"Tue 1"`. No month, no year, no indication of whether the museum was
open, no indication of what was on.

**Now** each cell names itself in full:

> "Sunday, January 4, 2026. Museum open 11am – 4pm. 1 event: Drawing With Scissors at 2pm"

### 2.3 Today was signalled by colour only — *fixed*

Today was marked with a CSS class (`today`) and nothing else — no `aria-current`, so it was
invisible to assistive technology, and distinguished only by colour, which fails
**1.4.1 Use of Colour**.

**Now:** `aria-current="date"`, an outline rather than a fill, and the words "today" inside the
cell's accessible name.

### 2.4 Month navigation was not focusable — *fixed*

Previous/next month were `<a>` elements **with no `href`**, so they were not in the tab order and
did not respond to Enter. They had `aria-label`s that no keyboard user could ever hear.

**Now:** real `<button>` elements, whose labels name the destination — "Previous month, December
2025" — rather than just "previous".

### 2.5 Changing month announced nothing — *fixed*

The grid redrew silently. A screen reader user pressing "next" got no confirmation that
anything happened.

**Now:** a polite live region announces, e.g., "February 2026. No events scheduled." or
"January 2026. 3 events."

### 2.6 The month/year was marked up as `<h1>` — *fixed*

```html
<h1><div class="yui3-calendar-header-label">September 2026</div></h1>
```

"September 2026" was the **only `<h1>` on the homepage**, and it appeared *after* an `<h3>` and
three `<h2>`s. Anyone navigating by heading met a page whose top-level heading was a month name.

**Now:** one `<h1>` per page naming the page, headings in order, and the calendar month as an
`<h3>` inside its section. Verified across all 11 pages — no level skips.

### 2.7 The calendar was empty and had no text alternative — *fixed*

The homepage calendar showed **September 2026 with no events on it**, under the heading
"Upcoming Events". There was no list of events anywhere on the homepage and no link to one — the
grid was the only route, so if you could not use the grid, you got nothing.

The reason it was empty: nothing has been published since **17 January 2026**. The `/upcomingevents`
page holds 14 listings, all now in the past.

**Now:**
- Every event is rendered as an **ordinary HTML list** with full dates, times, and links, present
  in the page whether or not JavaScript runs. The grid is an enhancement on top of the same data.
- The grid opens on a month that actually has something in it, and says why:
  *"Nothing is scheduled after January 2026 yet, so the most recent listings are shown."*
- Past events are labelled "This event has passed" rather than silently presented as upcoming.

> **Action needed from the museum:** publish current events. No amount of markup fixes an empty
> calendar. Add entries to `src/events.json` and rebuild.

---

## 3. Site-wide issues found along the way

| # | Finding | Status |
|---|---|---|
| 3.1 | **8 images with no alt text**, including all three collection images and all four footer logos (AAM, Ohio Arts Council, Feuerman Foundation, Medici). Content images, not decoration. | Fixed — every image described, or `alt=""` where genuinely decorative |
| 3.2 | **~20 links with no accessible name** — nav folder links, card "read more" arrows, an empty mailto. Screen reader announced "link" with nothing after it. | Fixed — zero nameless interactive elements across all 11 pages |
| 3.3 | Navigation menu **duplicated three times in the DOM**. Screen reader and keyboard users met every link three times. | Fixed — one nav, one set of links |
| 3.4 | Nav folders ("Connect", "On View", "Inspire") were `<a>` elements with no `href` — unreachable by keyboard. | Fixed — real disclosure `<button>`s with `aria-expanded`, Escape closes and returns focus |
| 3.5 | **`/exhibits` was an empty page** — header and footer only, reachable from the main nav. | Fixed — real content, since the material existed on the homepage |
| 3.6 | No current-page indication in the nav. | Fixed — `aria-current="page"`, shown with an underline as well as colour |
| 3.7 | Forms had no error handling; required fields were marked "(required)" as plain text with no `required` or `aria-required`. | Fixed — errors announced, tied to fields via `aria-describedby`, focus moves to the first problem, never colour-only |
| 3.8 | Hero and banner text sat directly on photographs with no scrim. Over the lightest parts of the image, body text measured roughly **3:1** — below the 4.5:1 minimum. | Fixed — image opacity capped so the brightest possible pixel still yields **5.5:1** |
| 3.9 | No skip link that worked, no landmark labels. | Fixed — visible-on-focus skip link, labelled `<nav>` landmarks |
| 3.10 | No `prefers-reduced-motion` handling. | Fixed |
| 3.11 | Small tap targets on mobile. | Fixed — standalone controls ≥ 44×44 CSS px; inline links exempt per 2.5.8 |

---

## What I could not fix, and why

**The forms do not send anywhere.** They are marked up correctly and validate accessibly, but
they have no delivery endpoint. Rather than let a visitor type out a message that silently
vanishes, every form says plainly that it is not connected and offers the phone number and email
instead. Wire up a form service and remove the `{{formNotice}}` tokens.

**The building's accessibility is not documented.** The `/visit` page deliberately makes **no
claims** about step-free entry, parking, lifts, seating, accessible toilets or assistance
animals, because none of that could be verified from the existing site. Publishing a guess here
would be worse than publishing nothing — a disabled visitor plans a trip around it. There is a
marked TODO in `src/pages/visit.html`; please fill in only what is true.

**Two exhibition posters were left out.** The current homepage carries promotional images for
"Dragana C…" and "Ross Pino: *Electric Stillness*" with no dates, no description and no alt
text. They are not in the rebuild because there was no way to caption them accurately. Send the
titles, dates and a sentence each and they can go back in.

**Search, the cart and the language picker are not carried over.** These were Squarespace
platform widgets rather than pages. The language picker in particular was a third-party
translation overlay; a static rebuild has no equivalent.

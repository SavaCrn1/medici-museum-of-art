# Medici Museum of Art — website rebuild

A static rebuild of [medicimuseum.art](https://www.medicimuseum.art/) that keeps the existing
look and every existing link, and fixes the accessibility problems in the contact details,
address and events calendar.

See **[ACCESSIBILITY.md](ACCESSIBILITY.md)** for the full audit — what was broken, how it was
measured, and what was done about it.

## Design

Deliberately close to the current site. Same logo, same black-on-white palette, same Archivo
Black display type, same full-bleed image bands and black footer. Body text uses Nunito Sans in
place of Proxima Nova, which is licensed through Adobe Fonts and cannot be served from a static
host; it is the nearest freely available match.

## Links

Every page slug is identical to the live site — `/about-us-1`, `/visit`, `/exhibits`,
`/upcomingevents`, `/tours`, `/rentals`, `/volunteer`, `/donate`, `/subscribe`, `/contact-us` —
so existing bookmarks, printed material and search results keep working. Outbound links
(Eventbrite, the volunteer application PDF, Rights and Reproductions, Facebook, Instagram, AAM,
Ohio Arts Council) all point where they did before.

## Build

No dependencies, no toolchain. Node 18+.

```bash
node build.js
```

That reads `src/pages/*.html` and wraps each in the shared shell defined in `build.js`, writing
plain HTML to the repository root. Header, footer, contact block, hours table, calendar and
event list are generated once and injected into every page.

```
src/site.config.js   address, phone, email, hours, nav — the single source of truth
src/events.json      event listings; feeds the list, the grid and the structured data
src/pages/*.html     page content only
build.js             the shell, the shared blocks, and the build
assets/css/site.css  one stylesheet
assets/js/site.js    nav, hours, calendar, form validation (all progressive enhancement)
assets/js/data.js    generated — do not edit
```

Output (`index.html`, `visit/index.html`, …) is committed so GitHub Pages can serve it directly.

### Changing things

| To change | Edit |
|---|---|
| Opening hours, phone, email, address | `src/site.config.js` — every page updates |
| Events | `src/events.json`, then rebuild |
| Page wording | `src/pages/<page>.html` |
| Navigation | the `nav` array in `src/site.config.js` |

Then run `node build.js` and commit.

## Local preview

```bash
npx http-server . -p 4321 -c-1
```

## Still to do

These need the museum, not the code:

1. **Confirm the opening hours.** The old site said Thursday–Sunday in the footer and
   Wednesday–Sunday on `/visit` and `/tours`. The rebuild uses Wednesday–Sunday. One line in
   `src/site.config.js` if that is wrong.
2. **Confirm `info@medicimuseum.art` is monitored.** The old footer displayed that address but
   linked to two named staff inboxes.
3. **Publish current events.** Nothing has been listed since 17 January 2026.
4. **Connect the forms.** They are accessible but have no delivery endpoint, and currently say so.
5. **Document the building's accessibility** on `/visit`. Left blank on purpose rather than
   guessed — see ACCESSIBILITY.md.
6. **Supply details for the two exhibition posters** on the current homepage so they can be
   captioned and reinstated.

## Images

Logos and photographs are the museum's own assets, taken from the existing site for this
rebuild. Alt text was written from the actual images.

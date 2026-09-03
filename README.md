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

The build stamps the stylesheet and scripts with a hash of their contents
(`site.css?v=892fe3e0`). GitHub Pages serves assets with `max-age=600`, so without this a
returning visitor gets new HTML with the stylesheet they already had for up to ten minutes after
a deploy — and markup whose CSS has not arrived collapses rather than degrading. The stamp only
changes when the file does, so unchanged deploys still cache normally. Nothing to do by hand.

### Changing things

| To change | Edit |
|---|---|
| Opening hours, phone, email, address | `src/site.config.js` — every page updates |
| Where email links go (Gmail vs the device's mail app) | `email.provider` in `src/site.config.js` |
| Events | `src/events.json`, then rebuild |
| Exhibitions | `src/exhibitions.json`, then rebuild |
| Page wording | `src/pages/<page>.html` |
| Navigation | the `nav` array in `src/site.config.js` |

Addresses and email addresses are written with two build tokens rather than hand-typed URLs:

```
{{map:9519 East Market St, Warren, OH 44484|Get directions||The Grand Resort}}
{{email:DTaylor@JetsFBO.com}}
```

`{{map:query|label|class|context}}` renders a map link — Google Maps in the HTML, swapped to
Apple Maps on Apple devices by `site.js`. `{{email:address|label|class}}` renders a link to
whichever mail destination `email.provider` names. Use `SELF` as the query or address to mean the
museum's own.

Exhibitions sort themselves into **On view now**, **Coming up** and past from their own `start`
and `end` dates each time you build, and the homepage leads with whichever is most relevant. So
an exhibition cannot sit under the wrong heading after it opens or closes — but the site does
need rebuilding and committing for the dates to be re-evaluated.

Then run `node build.js` and commit.

## Local preview

```bash
npx http-server . -p 4321 -c-1
```

## Still to do

These need the museum, not the code:

1. **Check the *Forest* dates.** The poster gives them as `09.10.2026–01.04.2027`. Read as US
   month-first, that is **10 September 2026 – 4 January 2027**, which is what the site now
   shows. If it was meant day-first, correct `src/exhibitions.json`.
2. **Add dates for Ross Pino, *Electric Stillness*.** It sits under "On view" on the current
   site with no dates published anywhere, so it is shown as on view with a TODO instead of an
   invented run.
3. **Confirm the opening hours.** The old site said Thursday–Sunday in the footer and
   Wednesday–Sunday on `/visit` and `/tours`. The rebuild uses Wednesday–Sunday. One line in
   `src/site.config.js` if that is wrong.
4. **Confirm `info@medicimuseum.art` is monitored.** The old footer displayed that address but
   linked to two named staff inboxes.
5. **Publish current events.** Nothing has been listed since 17 January 2026.
6. **Connect the forms.** They are accessible but have no delivery endpoint, and currently say so.
7. **Document the building's accessibility** on `/visit`. Left blank on purpose rather than
   guessed — see ACCESSIBILITY.md.

## Images

Logos and photographs are the museum's own assets, taken from the existing site for this
rebuild. Alt text was written from the actual images.

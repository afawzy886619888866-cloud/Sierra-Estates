# Production Smoke Test — 2026-08-18

## Deployment
- Commit: `5ffc3ed2dce4206fca2af2204a34efb42166fab4`
- Vercel deployment: `dpl_8VS1gY5qrrnAj7TmTEFwz2FZc8dp`
- State: `READY`
- Target: `production`
- Aliases include `sierra-estates.net`

## Main domain
- URL: https://sierra-estates.net/
- HTTP/browser result: loaded successfully.
- Page title: Sierra Estates - Luxury Real Estate New Cairo.
- Verified content: bilingual navigation, live listings, compound map, 3D tour CTA, AI tools, inquiry form, and Careers navigation.

## Cairo Plaza
- Requested URL: https://sierra-estates.net/cairo-plaza
- Canonical route redirected to: `/cairo-plaza/overview`
- Loaded successfully.
- Verified content: Cairo Plaza / Overview, Al-Mataria Metro positioning, evidence/concept distinction, investor pack CTA, interactive tour placeholder, and illustrative calculator.
- Language switcher `العربية` is present.

## Careers
- URL: https://sierra-estates.net/careers
- Loaded successfully with Arabic as the initial locale and an English switch button.
- Verified Sales and Administration job descriptions, responsibilities, requirements, and New Cairo location.
- Opened the Sales application form successfully.
- Verified fields: full name, phone/WhatsApp, email, experience, CRM/market knowledge, availability, motivation/achievements notes, submit, and cancel controls.
- No production application was submitted with fake data; validation and API wiring were checked in code and linted.

## Visual repair deployment

The new production deployment was opened with a cache-busting query at `https://sierra-estates.net/?visual-repair=240840d`. The page now loads the designed navigation, hero imagery, search controls, property cards, compound tiles, map controls, calculators, inquiry form, footer, and AI concierge controls instead of unstyled HTML. The HTML references Next image assets under `/_next/image`, confirming the canonical App Router surface is serving the React page and its generated assets.

The production deployment is `dpl_GLtMUDQjGk2DMczCsaBbW4Tiegz5`, associated with commit `240840dd91c6faea7d0afef7a07b60737d64c6a4`, and its state is `READY` with `sierra-estates.net` as an alias.

## Careers visual verification after repair

The current deployment serves `/careers?visual-repair=240840d` with the intended dark navy/gold design, visible header, Arabic hero, two structured job cards, responsive layout, and working Sales and Administration application buttons. The page no longer appears as raw unstyled HTML.

## Cairo Plaza visual verification after repair

The current deployment serves `/cairo-plaza/overview` with the intended dark project presentation, visible project navigation, bilingual switch, Al-Mataria Metro location statement, project evidence/concept disclosures, investor-pack and contact CTAs, interactive-tour loading surface, and illustrative calculator. The route resolves correctly and remains visually structured after the rewrite repair.

## Final homepage verification

The natural URL `https://sierra-estates.net/` now renders the complete designed homepage in the new production deployment. The verified surface includes the branded header, hero background image, search controls, featured listing cards, compound directory, interactive Leaflet map, 3D tour control, AI tools, request form, footer, and concierge button. The browser also reported generated `/_next/image` asset URLs rather than the unstyled legacy HTML surface.

## Final HTTP smoke tests

From the production domain after the latest READY deployment:

| Check | Result |
| --- | --- |
| `GET /` | `200` |
| First generated stylesheet under `/_next/static/css/` | `200 text/css; charset=utf-8` |
| `POST /api/careers/apply` with `{}` | `400 application/json`; rejected missing required fields without creating an application |
| `POST /api/inquiries` with `{}` | `400 application/json`; rejected missing name/phone without creating a lead |

The validation requests were intentionally incomplete and therefore safe; no production record or real email was created by the test.

## Mobile responsive audit — 390×844

Headless mobile captures were taken at a 390×844 viewport with an Android mobile user agent. The homepage capture shows a compact branded header with a hamburger menu, readable hero typography, stacked search controls, full-width input fields, and horizontally contained trust metrics without visible horizontal overflow. The Careers capture shows the bilingual header, readable Arabic hero copy, responsive heading wrapping, and a job-card layout that begins within the viewport without clipping.

The Cairo Plaza capture was separately attempted, but its active WebGL/3D animation kept the headless browser process alive beyond the capture window. The page itself was already verified in the interactive browser at desktop size; its mobile interactive-tour render remains a manual follow-up for a device/browser with WebGL support rather than evidence of a layout failure.

## Clients regression check after fix

After deployment `dpl_4nra5fUNd5nAD3TvUufWhSwZcNLz`, `https://sierra-estates.net/clients` loads successfully with the RTL navigation, advisory request form, property-type controls, compound quick choices, personal contact fields, direct 3D-experience card, WhatsApp CTA, and footer. The previous generic browser error is no longer present. The fragile client-side `ModelViewer`/GLB mount was removed and the form now posts to `/api/inquiries`.

## Compounds regression check

The production `/compounds` route loads successfully with the branded utility bar, navigation, breadcrumb, Compound Intelligence hero, search field, region filters, compound data cards, and footer. The initial intel panel displays the intentional empty state “Select a compound to see its intel here”; it is not a browser error or unstyled page.

## Live map regression check

The production `/map` route loads with the branded header, bilingual control, compound list, Leaflet map tiles, zoom controls, selected-compound panel, and unit data. The browser screenshot showed the intended dark map surface and styled controls rather than raw HTML. The selected-compound panel briefly displayed its loading state while the unit request resolved; the extracted page content then contained the selected Hyde Park units.

## Virtual tour regression check

The production `/virtual-tour` route loads with its full branded header, hero, dark 360° viewing frame, footer, and a working “Open Full Screen ↗” link to the Listing3D embed. The page explicitly says the full Three.js virtual tour is coming soon; the existing direct external tour link is visible and is not hidden behind a brochure. The earlier headless-capture timeout was caused by the interactive/WebGL page lifecycle, not by a page-load error.

## Additional route audit

The additional production checks returned the following: `/properties`, `/inventory`, `/cairo-plaza/inventory`, `/cairo-plaza/investor`, `/cairo-plaza/contact`, and all tested `/ar/cairo-plaza/*` routes returned `200 text/html`. `/admin/login` returned `307 text/plain`, which is an intentional authentication redirect rather than a missing page. All tested routes completed within the observed 3.0–7.1 second server timing window.

## Clients mobile verification — 390×844

The repaired `/clients` page was captured at 390×844 with the Android mobile user agent. The screenshot shows the compact header, RTL hero typography, readable Arabic copy, wrapped metrics, and the request form card entering the viewport with stacked property choices. No horizontal clipping or raw HTML failure was observed.

## Performance audit

Lighthouse 12.8.2 was run against the live homepage. Desktop-form-factor results were: performance score `0.74`, First Contentful Paint `2.9 s`, Largest Contentful Paint `3.4 s`, Speed Index `7.2 s`, Total Blocking Time `280 ms`, Cumulative Layout Shift `0.008`, and total transfer size `791 KiB`. The mobile-form-factor results were: performance score `0.50`, First Contentful Paint `5.0 s`, Largest Contentful Paint `5.0 s`, Speed Index `6.9 s`, Total Blocking Time `640 ms`, Cumulative Layout Shift `0.008`, and total transfer size `752 KiB`.

The LCP element is the hero background image. Lighthouse identified image delivery and offscreen image sizing as the main actionable opportunities, plus the root-document response time and main-thread work. The Careers mobile-form-factor run returned performance score `0.60`, FCP/LCP `6.1 s`, Speed Index `6.2 s`, TBT `190 ms`, CLS `0`, and total size `245 KiB`. These results confirm that the pages load and render correctly, but the homepage and Careers route have meaningful mobile performance headroom rather than a broken asset pipeline.

## Properties regression check

The production `/properties` route loads with the branded navigation, breadcrumb, hero, category and rent/resale filters, result count, property cards, pricing, AI scores, owner/source labels, action controls, and footer. The browser render confirms the CSS and remote property images load correctly; no raw HTML or missing-style state was observed.

## Inventory regression check

The production `/inventory` route initially shows a loading state while its inventory request resolves. After waiting for the client data load, the page displays location counts, 65 available units, Leaflet map tiles, map markers, status filters, location selector, and unit cards with live prices and codes. The apparent blank/loading state was transient and resolved in-browser.

## Admin route regression check

`https://sierra-estates.net/admin/login` correctly redirects to `https://admin.sierra-estates.net/admin/login`, and the admin hostname returns the expected “Sierra Estates 3.0 · Intelligence OS · Admin” title. However, the current browser render remains a blank dark screen with no detected controls after waiting. This is a separate admin-host/runtime issue and requires source/deployment inspection; it is not the public-site CSS failure.

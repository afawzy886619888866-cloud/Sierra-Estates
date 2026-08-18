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

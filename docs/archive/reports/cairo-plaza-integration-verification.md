# Cairo Plaza integration verification

Verified on 2026-08-24:

- `https://sierra-estates.net/cairo-plaza` loads the existing broker domain's English Cairo Plaza page.
- `https://sierra-estates.net/ar/cairo-plaza` loads the Arabic Cairo Plaza page with Arabic route navigation and the location phrased as أمام محطة مترو المطرية.
- The page is additive: the current site remains a separate broker/listings experience, while Cairo Plaza is available under its own `/cairo-plaza` route.
- The live homepage visited during verification did not yet show the newly pushed header link, indicating the main site's deployment/CDN may not have refreshed at the time of capture. The GitHub commit is `cabf0f6` and adds the link plus the Important Projects homepage section.
- The Cairo Plaza route itself is live and includes Overview, Available inventory, Investor pack, Contact, language switching, an illustrative calculator, and current-site versus AI-concept disclosure language.

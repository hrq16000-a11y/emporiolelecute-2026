# Boutique editorial

## Selected order-tracking privacy fix
- [x] Code-only tracking omits contact/address/notes/personalization; deployed function verified for guest, verified owner, unrelated customer and admin. Guest UI retains status on desktop/mobile/tablet; synthetic orders removed.
- [x] Checkout uses cryptographic randomness with rejection sampling; LC + six-character format and retry code unchanged. Three targeted privacy tests and lint passed; preview build OK.
- [x] Selected critical finding resolved after live verification; no unrelated finding changes or frontend publication.

## Floating WhatsApp correction
- [x] Keep WhatsApp fixed through a body portal outside route transforms; verified viewport bounds at top/middle/end in 390/768/1440 and isolated cart-action delegation. Targeted lint/build and five storefront guards passed; full checkout not repeated.
- [x] Authorized Round 7: private admin-only motion control persisted in account preferences; anonymous default and system reduction verified at 390/768/1440. Admin navigation/reload, saved database value and customer direct-route denial passed; preference restored.
- [x] Triage all available scan groups; 35 verified warnings marked fixed, 28 warnings and 9 informational findings remain active. Fifteen protected services denied anonymous/customer requests; admin analytics returned 200. Eight affected schedules use private headers. No blanket dismissals; completed task has incomplete code coverage and reintroduced findings. New coverage critical mapped to verified fix; public order-details critical remains a release blocker.
- [x] Hero stability: two focused E2E tests passed; admin preview geometry and system reduction rechecked at 390/768/1440. Organization and Product JSON-LD plus public crawler output checked; public sitemap preserved and draft hidden. No frontend publication or DNS changes.

## Hero structural stability
- [x] Reproduce height collapse while real banners replaced text fallback and measured slide height; scroll stayed zero during animation.
- [x] Use a static overlapping grid stage and responsive image ratios; reserve loading space and keep header clearance stable.
- [x] Verify 390/768/1440 continuously through zoom/slide swaps, reduced motion, disabled animations, menu and resize; hero geometry is stable at each width.
- [ ] Publication and production verification — no publication authorized in this round; frontend remains preview-only.
- [x] Authorized security round: corrected all three selected critical paths; stored report payload inert, anonymous requests 401, customers 403, admin validation 400; daily monitor uses private worker credentials. Findings marked fixed; other warnings remain and prior deep coverage was partial.
- [x] After security verification, aligned initial Home/loading shell and both admin banner previews; 390/768/1440 geometry stable, system/site reduced motion stops timers. 161 unit tests, 2 desktop stability tests, 5 storefront guards and targeted lint passed; preview build OK.
- DNS, catalog, checkout and publication remain out of scope for this round.

## Updated 3D motion release
- [x] Verify 360/390/768/1440 widths, system reduced motion, toggle persistence, reactivation and stopped hero/PDP autoplay; 155 tests passed.
- [x] Triage current security findings; revoke anonymous administrative listing access and verify denial. Public catalog/config reads and guarded allowlisted sorting remain intentional, not marked resolved. Quick scan has no critical findings.
- [x] Deep security scan result received with partial code coverage and three critical findings; not a clean security verdict.
- [x] Previous publication confirmed HTTP 200 at https://emporiolelecute.lovable.app with motion toggle present; the later Hero structural fix is not published.
- [ ] Correct external domain routing — requires DNS changes at Hosteg, with email routing preserved.

## Operational and support production review
- [x] Recheck deployed permissions and sticky catalog blocking; authenticated message forgery/lease attempts and anonymous chat/scan access denied; shared CSV formulas neutralized, 22 regression tests passed.
- [x] Verify support on desktop/mobile: unknown answer and explicit handoff persisted, admin reply saved, resolved composer disabled, mobile send clears privacy banner; browser runtime errors absent and targeted lint/build clean.

## Address and customer support
- [x] Test new and cached CEP without clicks; clear obsolete city/state on CEP changes and preserve manual corrections without canceling other fields.
- [x] Add authenticated support threads saved to the customer account, grounded in published help and own orders, with human inbox.
- [x] Verify separate threads, reload, order lookup, uncertainty handoff, human reply and mobile layout; build passed; targeted lint status was not recorded. Global lint retains pre-existing errors.

## Production readiness and first campaign
- [x] Review operational permissions, sticky catalog regression gate, leased retries and exports; authenticated scan/save/download and leased image retry verified, anonymous calls denied, rollback-only gate test passed. Clean local restore remains unverified.
- [ ] Natal quote campaign: goal confirmed and Brazil research saved; choose buyer audience and campaign type, then creative and tracking. No spending without explicit approval.

## Operational controls
- [x] Harden manual image retries and queue monitoring; real image retry reached done.
- [x] Add scan alert destination/rule settings and catalog approval gate; repeated-scan blocking, statement enforcement and approval verified with transaction rollback and no persistent fixtures.
- [x] Add full Lighthouse Web Vitals CSV/JSON exports and configurable daily retention; downloads verified with temporary metrics, test data removed.
- [ ] Activate external scan alerts — Slack connection declined and email sender not configured; destination settings and failure reasons are persisted, delivery not implemented.

## Global SEO
- [x] Add unified metadata, robots editing and sitemap status/count/regeneration at /admin/seo-global.
- [x] Verify saves and regeneration, distinguishing generated content from public files; authenticated readback and XML download verified, two count/validation tests pass.

## Search pinning
- [x] Add draft preview and explicit publication to the existing boost editor.
- [x] Validate ranking preview, permissions, and publication without changing public search behavior; six tests pass, temporary pin removed after storefront verification.

- [x] Guide for design tokens, visual QA checklist and prioritized Sprint 3 backlog.
- [x] Side-by-side Home/Search/Category ProductCard mockups, clearly labeled as proposals.
- [x] Admin-managed Como é feito draft with five editable sections.
- [x] Admin-managed packaging story on site and PDP: seal, handwritten card and tissue paper.
- [x] Admin-managed after-sales rules per product, timing and message previews; sending is not implemented or activated.
- [x] Four narrative collection drafts with curated existing products and administrative editing.
- [x] Verify admin saves and public rendering; four scheduling tests pass and preview build is OK.
- [ ] Complete Como é feito first-person process copy and publication — waiting for owner's actual process details.
- [ ] Activate scheduled follow-up delivery — waiting for an owned sender domain; promotional repurchase also needs a separate marketing service and consent.
# Selected security fixes — 24 November 2026

Scope: only the eleven findings explicitly selected by the owner. Starting HEAD: `961d9d28`. No unrelated findings fixed or ignored.

## Implemented and verified in source

1. Hidden-product shipping probes: catalog lookup requires `is_active = true`; any unavailable item rejects the entire quote, including mixed carts.
2. Shipping fallback audit postcode: destination fields omitted from all sibling audit paths. Existing historical records untouched.
3. Shipping diagnostic postcode: removed destination from diagnostic payload; exception logs/responses cannot echo raw provider content.
4. Shipping cache-hit postcode: cache identifier no longer printed. Operational cache behavior retained.
5. GSC export formula injection: the admin report now uses existing `toCsv` sanitization rather than quote-only formatting. Numeric metrics preserved.
6. Subscription ownership overwrite: insert ignores existing endpoint conflicts; subsequent updates are scoped to both endpoint and confirmed owner email. Cross-owner conflicts return generic authorization denial. No owner field appears in updates.
7. Unpublished combination paths: query requires indexable and approved rows; response construction repeats those checks defensively.

These seven selected findings were marked fixed through the security findings tool. The four below remain active; none were ignored.

## Contextual approval still required

| Severity | Selected concern | Blocker |
| --- | --- | --- |
| Critical | Guest-created order can send confirmation to an unverified third-party email | Verified sign-in would change guest checkout; owner confirmation requested before restriction |
| Warning | Order-code confirmation branch permits unauthorized lookup and sends | Same guest confirmation authorization decision; not changed or marked fixed |
| Warning | Anonymous shipping uses stored carrier credentials | Restricting carrier quotes to authenticated users changes guest freight calculation; owner confirmation requested |
| Warning | Visitor identifier alone authorizes profile/activity changes | Browser-bound credentials require a migration/rotation strategy for legacy browsers; owner confirmation requested before resetting anonymous history |

Do not treat a UUID or User-Agent as proof of visitor ownership. Existing behavior was inspected but deliberately not relabeled as secure. No new visitor secret or database structure was introduced.

## Evidence and limitations

- `bun run test --run src/test/selected-security-findings.test.ts src/lib/seoExport.test.ts src/test/round1-order-privacy.test.ts`: **22 passed** (7 new focused tests, 2 export tests, 13 authorization regression tests).
- Actual shipping, notification and JSON-LD function handlers executed with synthetic in-memory clients and HTTP requests. Tests prove mixed hidden-item denial, fallback and cache-log redaction, conflicting endpoint unchanged, owner registration/readback and draft path omission even if a selection helper returns drafts.
- No calls made to carriers, no emails sent and no real customer data read or modified by tests.
- Targeted test-file lint and `git diff --check`: PASS.
- Automatic compilation: **build OK, 05:21:47 UTC**. No manual build or general scan rerun.
- No frontend publication, function deployment, database migration or changes to the concurrent PR's files. Code changes alone do not prove shared-backend deployment; live functions still require a separately approved coordinated deployment.
- New commit recorded in the final delivery; this report is included in that commit.

## Files

- `src/pages/admin/AdminSEODashboard.tsx`
- `supabase/functions/calculate-shipping/index.ts`
- `supabase/functions/notification-prefs/index.ts`
- `supabase/functions/seo-jsonld-hubs/index.ts`
- `src/test/selected-security-findings.test.ts`
- `AGENTS.md`, `roadmap.md`, this report

**Decision: NO-GO for claiming all selected issues resolved or publishing.** Seven source fixes passed isolated verification; four selected risks await explicit contextual approval. No claim of comprehensive penetration testing or complete security coverage.
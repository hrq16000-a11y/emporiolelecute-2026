import { describe, expect, it } from 'vitest';
import { boostDraftKey, canPublishBoost, validBoostDraft, type BoostDraft } from './search-boost-preview';
const draft: BoostDraft = { term: 'sabonete', product_id: 'product-a', weight: 100, is_active: true, campaign_label: '', starts_at: null, ends_at: null };
describe('boost publication gate', () => {
  it('requires a preview before publication', () => expect(canPublishBoost(draft, null)).toBe(false));
  it('permits the exact previewed draft', () => expect(canPublishBoost(draft, boostDraftKey(draft))).toBe(true));
  it('invalidates preview when weight changes', () => expect(canPublishBoost({ ...draft, weight: 101 }, boostDraftKey(draft))).toBe(false));
  it('invalidates preview when product changes', () => expect(canPublishBoost({ ...draft, product_id: 'product-b' }, boostDraftKey(draft))).toBe(false));
  it('enforces integer weights from 1 to 1000', () => { expect(validBoostDraft({ ...draft, weight: 1000 })).toBe(true); expect(validBoostDraft({ ...draft, weight: 1001 })).toBe(false); expect(validBoostDraft({ ...draft, weight: 0 })).toBe(false); expect(validBoostDraft({ ...draft, weight: 1.5 })).toBe(false); });
  it('rejects a reversed campaign period', () => expect(validBoostDraft({ ...draft, starts_at: '2026-11-10T00:00:00Z', ends_at: '2026-11-09T00:00:00Z' })).toBe(false));
});
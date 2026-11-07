export interface BoostDraft {
  term: string;
  product_id: string;
  weight: number;
  is_active: boolean;
  campaign_label: string;
  starts_at: string | null;
  ends_at: string | null;
}

export const boostDraftKey = (draft: BoostDraft) => JSON.stringify(draft);
export const validBoostDraft = (draft: BoostDraft) => draft.term.trim().length >= 2 && !!draft.product_id && Number.isInteger(draft.weight) && draft.weight >= 1 && draft.weight <= 1000 && !(draft.starts_at && draft.ends_at && Date.parse(draft.starts_at) >= Date.parse(draft.ends_at));
export const canPublishBoost = (draft: BoostDraft, previewKey: string | null) => validBoostDraft(draft) && boostDraftKey(draft) === previewKey;

export interface BoostPreviewResult {
  before: { ids: string[]; total: number };
  after: { ids: string[]; total: number };
}
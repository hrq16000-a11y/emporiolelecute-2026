import { describe, expect, it } from 'vitest';
import { defaultAfterSalesRule, followupDueAt, canScheduleFollowup } from './after-sales';
describe('after-sales scheduling', () => {
  it('schedules exactly three days after the recorded event', () => {
    expect(followupDueAt('2026-11-07T12:00:00Z', 3)).toBe('2026-11-10T12:00:00.000Z');
  });
  it('does not schedule disabled rules', () => expect(canScheduleFollowup(defaultAfterSalesRule, 'delivered', 'delivered')).toBe(false));
  it('does not substitute payment confirmation for arrival', () => expect(canScheduleFollowup({ ...defaultAfterSalesRule, enabled: true }, 'paid', 'confirmed')).toBe(false));
  it('excludes cancelled orders', () => expect(canScheduleFollowup({ ...defaultAfterSalesRule, enabled: true }, 'delivered', 'cancelled')).toBe(false));
});
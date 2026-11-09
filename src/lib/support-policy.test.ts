import { expect,it } from 'vitest';
import { ownsOrder,wantsHuman } from '../../supabase/functions/support-chat/policy';
it('hands off an explicit request for a person',()=>expect(wantsHuman('Quero falar com uma pessoa')).toBe(true));
it('does not treat a help question as a human request',()=>expect(wantsHuman('Como funciona a entrega?')).toBe(false));
it('does not disclose another customer order',()=>expect(ownsOrder('customer@example.com','other@example.com')).toBe(false));
it('requires a verified account identity',()=>expect(ownsOrder(undefined,'customer@example.com')).toBe(false));

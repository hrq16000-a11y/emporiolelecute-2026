import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

export const authorizeOperationalRequest = async (req: Request, allowEditor = false): Promise<'manual' | 'cron' | Response> => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response('Service unavailable', { status: 503, headers: corsHeaders });
  const client = createClient(url, key, { auth: { persistSession: false } });
  const secret = req.headers.get('x-operational-secret');
  if (secret) {
    const { data, error } = await client.from('operational_worker_credentials').select('token').eq('id', true).single();
    if (!error && data?.token === secret) return 'cron';
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return new Response('Authentication required', { status: 401, headers: corsHeaders });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return new Response('Authentication required', { status: 401, headers: corsHeaders });
  const { data: roles, error: roleError } = await client.from('user_roles').select('role').eq('user_id', data.user.id);
  if (roleError || !roles?.some(role => role.role === 'admin' || (allowEditor && role.role === 'editor'))) {
    return new Response('Administrative permission required', { status: 403, headers: corsHeaders });
  }
  return 'manual';
};
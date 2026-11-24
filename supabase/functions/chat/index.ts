import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Legacy stateless endpoint is retired. Account support uses support-chat.
Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(JSON.stringify({ error: 'Este chat foi substituído pelo suporte da loja.', supportPath: '/suporte' }), {
    status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

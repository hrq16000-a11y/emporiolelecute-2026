import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mayReadOrderDetails, trackingResponse } from './privacy.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

interface TrackOrderRequest {
  orderCode: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: TrackOrderRequest = await req.json();
    const { orderCode } = body;

    // Validate order code
    if (!orderCode || typeof orderCode !== "string") {
      return new Response(
        JSON.stringify({ error: "Order code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and normalize order code
    const sanitizedCode = orderCode.trim().toUpperCase();
    
    // Validate order code format (alphanumeric, reasonable length)
    if (!/^[A-Z0-9]{4,20}$/.test(sanitizedCode)) {
      return new Response(
        JSON.stringify({ error: "Invalid order code format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order by code
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_code", sanitizedCode)
      .maybeSingle();

    if (orderError) {
      console.error("Error fetching order:", orderError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found", order: null, items: [] }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_name, product_slug, product_image, quantity, unit_price, personalization")
      .eq("order_id", order.id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The legacy short order code permits tracking, never identity verification.
    let privateAccess = false;
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (token) {
      const { data: identity, error: identityError } = await supabase.auth.getUser(token);
      if (!identityError && identity.user) {
        const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
          _user_id: identity.user.id, _role: 'admin',
        });
        privateAccess = mayReadOrderDetails(identity.user, order.customer_email, !roleError && isAdmin === true);
      }
    }
    return new Response(
      JSON.stringify(trackingResponse(order, items || [], privateAccess)),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Track order error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

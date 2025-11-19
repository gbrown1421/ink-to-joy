import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIMI_PANDA_API_URL = 'https://api.mimi-panda.com/api/coloring/job';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pageId = url.searchParams.get('pageId');

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: 'Page ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get page record
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return new Response(
        JSON.stringify({ error: 'Page not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already ready or failed, return current status
    if (page.status === 'ready' || page.status === 'failed') {
      return new Response(
        JSON.stringify({ 
          status: page.status, 
          coloringImageUrl: page.coloring_image_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check Mimi Panda status
    const mimiResponse = await fetch(`${MIMI_PANDA_API_URL}/${page.mimi_key}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MIMI_PANDA_API_TOKEN')}`,
      },
    });

    if (!mimiResponse.ok) {
      console.error('Mimi Panda status check error:', await mimiResponse.text());
      return new Response(
        JSON.stringify({ status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mimiData = await mimiResponse.json();
    const mimiStatus = mimiData.status;

    if (mimiStatus === 'ready' && mimiData.images && mimiData.images.length > 0) {
      // Update page with coloring image URL
      const coloringImageUrl = mimiData.images[0];
      await supabase
        .from('pages')
        .update({ 
          status: 'ready', 
          coloring_image_url: coloringImageUrl 
        })
        .eq('id', pageId);

      return new Response(
        JSON.stringify({ status: 'ready', coloringImageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (mimiStatus === 'error' || mimiStatus === 'failed') {
      await supabase
        .from('pages')
        .update({ status: 'failed' })
        .eq('id', pageId);

      return new Response(
        JSON.stringify({ status: 'failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Still processing
    return new Response(
      JSON.stringify({ status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-page-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

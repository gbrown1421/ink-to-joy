import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pageId, easyBlob, beginnerBlob } = await req.json();

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: 'Page ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pageFolder = `pages/${pageId}`;
    
    // Upload easy version
    if (easyBlob) {
      const easyBuffer = Uint8Array.from(atob(easyBlob), c => c.charCodeAt(0));
      const easyFileName = `${pageFolder}/easy.png`;
      const { error: easyError } = await supabase.storage
        .from('book-images')
        .upload(easyFileName, easyBuffer, { 
          contentType: 'image/png',
          upsert: true 
        });
      
      if (!easyError) {
        const { data: { publicUrl: easyUrl } } = supabase.storage
          .from('book-images')
          .getPublicUrl(easyFileName);
        
        await supabase
          .from('pages')
          .update({ easy_image_url: easyUrl })
          .eq('id', pageId);
      }
    }
    
    // Upload beginner version
    if (beginnerBlob) {
      const beginnerBuffer = Uint8Array.from(atob(beginnerBlob), c => c.charCodeAt(0));
      const beginnerFileName = `${pageFolder}/beginner.png`;
      const { error: beginnerError } = await supabase.storage
        .from('book-images')
        .upload(beginnerFileName, beginnerBuffer, { 
          contentType: 'image/png',
          upsert: true 
        });
      
      if (!beginnerError) {
        const { data: { publicUrl: beginnerUrl } } = supabase.storage
          .from('book-images')
          .getPublicUrl(beginnerFileName);
        
        await supabase
          .from('pages')
          .update({ beginner_image_url: beginnerUrl })
          .eq('id', pageId);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-difficulty-versions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

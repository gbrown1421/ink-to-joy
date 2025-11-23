import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mimi Panda status check endpoint
const MIMI_PANDA_API_BASE_URL = 'https://mimi-panda.com/api/service/item';

/**
 * POLLS Mimi Panda API to check if a coloring job is complete.
 * When ready, downloads the result, stores it as "intermediate_image_url",
 * and triggers difficulty post-processing.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let pageId: string | null = null;

  try {
    const body = await req.json();
    pageId = body.pageId;

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: 'Page ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get page record with book difficulty
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*, books!inner(difficulty)')
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
          coloringImageUrl: page.intermediate_image_url || page.coloring_image_url
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Poll Mimi Panda API for job status
    console.log('Checking Mimi status for key:', page.mimi_key);
    const mimiResponse = await fetch(`${MIMI_PANDA_API_BASE_URL}/${page.mimi_key}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MIMI_PANDA_API_TOKEN')}`,
      },
    });

    if (!mimiResponse.ok) {
      const errorText = await mimiResponse.text();
      console.error('Mimi Panda status check error:', mimiResponse.status, errorText);
      return new Response(
        JSON.stringify({ status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mimiData = await mimiResponse.json();
    console.log('Mimi status:', mimiData.status);

    // BUG FIX: Mimi Panda returns "ready" (not "completed") when job is done
    if (mimiData.status !== 'ready') {
      return new Response(
        JSON.stringify({ status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // BUG FIX: Mimi Panda returns images in an array, not result_url
    const resultUrl = mimiData.images?.[0];
    console.log('Mimi job completed! Result URL:', resultUrl);
    console.log('Full Mimi result:', JSON.stringify(mimiData, null, 2));

    if (!resultUrl) {
      throw new Error('No image URL returned from Mimi Panda');
    }

    // Download Mimi image and store it in our Supabase storage (enables CORS for client-side processing)
    console.log('Mimi job completed! Downloading image from:', resultUrl);

    try {
      const imageResponse = await fetch(resultUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const filename = `${pageId}-master.jpg`;
      const storagePath = `books/${page.book_id}/pages/${filename}`;

      console.log('Uploading master image to storage:', storagePath);
      const { error: uploadError } = await supabase.storage
        .from('book-images')
        .upload(storagePath, imageBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Failed to upload master image to storage:', uploadError);
        throw uploadError;
      }

      // Get public URL from our storage
      const { data: urlData } = supabase.storage
        .from('book-images')
        .getPublicUrl(storagePath);

      const masterImageUrl = urlData.publicUrl;
      console.log('Master image uploaded to our storage:', masterImageUrl);

      // Save the master image URL (client will generate variants)
      const { error: updateError } = await supabase
        .from('pages')
        .update({
          intermediate_image_url: masterImageUrl,
          status: 'ready',
        })
        .eq('id', pageId);

      if (updateError) {
        console.error('Error updating page:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update page', success: false }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✓ Page marked ready with master image');

      return new Response(
        JSON.stringify({ 
          status: 'ready',
          success: true,
          masterImageUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (downloadError) {
      console.error('Error downloading/uploading master image:', downloadError);
      return new Response(
        JSON.stringify({ 
          status: 'failed', 
          success: false, 
          error: `Failed to process master image: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error checking status:', error);
    
    // Mark as failed if something goes wrong
    if (pageId) {
      try {
        await supabase
          .from('pages')
          .update({ status: 'failed' })
          .eq('id', pageId);
      } catch (e) {
        console.error('Failed to update page status:', e);
      }
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

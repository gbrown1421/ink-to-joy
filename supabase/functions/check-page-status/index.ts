import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mimi Panda status check endpoint - per official API docs
const MIMI_PANDA_STATUS_URL = 'https://mimi-panda.com/api/service/item';

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

    // Add significant delay before first check to allow job to be created in Mimi system
    const pageAge = Date.now() - new Date(page.created_at).getTime();
    const MIN_AGE_MS = 30000; // 30 seconds
    if (pageAge < MIN_AGE_MS) {
      console.log('Page too new, waiting before first check. Age:', pageAge, 'ms, Required:', MIN_AGE_MS, 'ms');
      return new Response(
        JSON.stringify({ status: 'processing', waiting_period: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Poll Mimi Panda API for job status with aggressive retry logic
    const apiToken = Deno.env.get('MIMI_PANDA_API_TOKEN');
    const statusUrl = `${MIMI_PANDA_STATUS_URL}/${page.mimi_key}`;
    
    console.log('=== STATUS CHECK REQUEST ===');
    console.log('API Token configured:', !!apiToken);
    console.log('Token length:', apiToken?.length || 0);
    console.log('Checking Mimi status for key:', page.mimi_key);
    console.log('Full status URL:', statusUrl);
    
    // Aggressive retry with exponential backoff
    const MAX_RETRIES = 7;
    const INITIAL_DELAY = 1000; // 1 second
    let mimiResponse: Response | null = null;
    let lastError = '';
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = INITIAL_DELAY * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      try {
        mimiResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        });

        console.log(`Attempt ${attempt + 1}: Mimi response status: ${mimiResponse.status}`);
        console.log('Mimi response content-type:', mimiResponse.headers.get('content-type'));

        if (mimiResponse.ok) {
          console.log(`✓ Success on attempt ${attempt + 1}`);
          break; // Success! Exit retry loop
        }

        // Log error but continue retrying
        const errorText = await mimiResponse.text();
        lastError = errorText;
        console.error(`Attempt ${attempt + 1} failed: ${mimiResponse.status}`);
        console.error('Error response (first 500 chars):', errorText.substring(0, 500));
        
        // If we've exhausted retries, break
        if (attempt === MAX_RETRIES - 1) {
          console.error('All retry attempts exhausted');
        }
      } catch (fetchError) {
        console.error(`Attempt ${attempt + 1} fetch error:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        if (attempt === MAX_RETRIES - 1) {
          console.error('All retry attempts exhausted due to fetch errors');
        }
      }
    }

    // If all retries failed, return processing status
    if (!mimiResponse || !mimiResponse.ok) {
      console.error('Failed after all retries. Returning processing status.');
      return new Response(
        JSON.stringify({ status: 'processing', retries_exhausted: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if response is actually JSON
    const contentType = mimiResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const responseText = await mimiResponse.text();
      console.error('Expected JSON but got:', contentType);
      console.error('Response body (first 500 chars):', responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mimiData = await mimiResponse.json();
    console.log('Mimi response data:', JSON.stringify(mimiData));
    console.log('Mimi status:', mimiData.status);

    // Per docs: status is "in_queue", "processing", "ready", or "failed"
    if (mimiData.status === 'failed') {
      await supabase
        .from('pages')
        .update({ status: 'failed' })
        .eq('id', pageId);
      
      return new Response(
        JSON.stringify({ status: 'failed', error: 'Mimi processing failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mimiData.status !== 'ready') {
      return new Response(
        JSON.stringify({ status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Per docs: images are in an array
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

      const coloringImageUrl = urlData.publicUrl;
      console.log('Coloring image uploaded to our storage:', coloringImageUrl);

      // Save as master/intermediate image URL
      const { error: updateError } = await supabase
        .from('pages')
        .update({
          intermediate_image_url: coloringImageUrl,
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
          intermediateImageUrl: coloringImageUrl,
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

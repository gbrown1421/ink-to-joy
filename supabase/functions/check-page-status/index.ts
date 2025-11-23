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

    // Download the completed "Intermediate" (V2 Simplified) image from Mimi
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download Mimi result: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    
    console.log('Downloaded Mimi result:', imageBuffer.byteLength, 'bytes');

    // Import sharp for post-processing
    const sharp = (await import('https://deno.land/x/sharp@v0.33.2/mod.ts')).default;

    // Get book difficulty (quick | beginner | intermediate)
    const difficulty = (page.books as any)?.difficulty || 'beginner';
    console.log('Book difficulty:', difficulty);

    // Store base Mimi result as "intermediate" (Beginner & Intermediate will use this)
    const intermediateBuffer = await sharp(imageBuffer)
      .png()
      .toBuffer();

    const intermediatePath = `${page.book_id}/${page.id}-intermediate.png`;
    const { error: intermediateError } = await supabase.storage
      .from('book-images')
      .upload(intermediatePath, intermediateBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (intermediateError) {
      console.error('Error storing intermediate image:', intermediateError);
      throw intermediateError;
    }

    const { data: { publicUrl: intermediateUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(intermediatePath);

    console.log('Stored intermediate (Beginner/Intermediate) at:', intermediateUrl);

    // For Quick & Easy: apply extra simplification for toddlers
    let easyUrl = intermediateUrl;
    if (difficulty === 'quick') {
      console.log('Applying toddler simplification for Quick & Easy...');
      
      const toddlerBuffer = await sharp(imageBuffer)
        .resize({ width: 1000, withoutEnlargement: true })
        .blur(1.2)          // Smooth away tiny wiggles
        .threshold(210)     // Pure black/white, no grey
        .png()
        .toBuffer();

      const easyPath = `${page.book_id}/${page.id}-easy.png`;
      const { error: easyError } = await supabase.storage
        .from('book-images')
        .upload(easyPath, toddlerBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (easyError) {
        console.error('Error storing easy image:', easyError);
        throw easyError;
      }

      const { data: { publicUrl: easyPublicUrl } } = supabase.storage
        .from('book-images')
        .getPublicUrl(easyPath);

      easyUrl = easyPublicUrl;
      console.log('Stored Quick & Easy (toddler-simplified) at:', easyUrl);
    } else {
      console.log('Using same image for all difficulties (Beginner/Intermediate mode)');
    }

    // Update page with appropriate URLs based on difficulty
    // Quick & Easy gets simplified version, Beginner & Intermediate get Mimi output
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        intermediate_image_url: intermediateUrl,  // Mimi base (for Beginner & Intermediate)
        beginner_image_url: intermediateUrl,      // Mimi base
        easy_image_url: easyUrl,                   // Simplified for toddlers (if quick)
        coloring_image_url: intermediateUrl,       // Default to Mimi base
        status: 'ready',
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('Error updating page:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update page' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        status: 'ready', 
        coloringImageUrl: intermediateUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

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

    // Download the completed Mimi V2 Simplified image (our "master" / intermediate)
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download Mimi result: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    
    console.log('Downloaded Mimi result (master):', imageBuffer.byteLength, 'bytes');

    // Import sharp for post-processing
    const sharp = (await import('https://deno.land/x/sharp@v0.33.2/mod.ts')).default;

    // Get book difficulty to determine which URL to return
    const difficulty = (page.books as any)?.difficulty || 'beginner';
    console.log('Book difficulty:', difficulty);

    // ===== STEP 1: Store raw Mimi result as INTERMEDIATE (master) =====
    console.log('Storing Mimi master as intermediate...');
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

    console.log('✓ Intermediate (master) stored at:', intermediateUrl);

    // ===== STEP 2: Generate BEGINNER version (light simplification) =====
    console.log('Generating beginner version (light simplification)...');
    const beginnerBuffer = await sharp(imageBuffer)
      .grayscale()
      .blur(0.5)          // Very light blur to remove tiny speckles
      .normalize()        // Stretch histogram for cleaner blacks/whites
      .threshold(200)     // Convert to pure black/white, threshold at 200
      .png()
      .toBuffer();

    const beginnerPath = `${page.book_id}/${page.id}-beginner.png`;
    const { error: beginnerError } = await supabase.storage
      .from('book-images')
      .upload(beginnerPath, beginnerBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (beginnerError) {
      console.error('Error storing beginner image:', beginnerError);
      throw beginnerError;
    }

    const { data: { publicUrl: beginnerUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(beginnerPath);

    console.log('✓ Beginner version stored at:', beginnerUrl);

    // ===== STEP 3: Generate QUICK & EASY version (heavy simplification) =====
    console.log('Generating quick version (heavy simplification for toddlers)...');
    
    // Strategy: downscale aggressively to kill detail, then upscale with heavy blur/threshold
    const metadata = await sharp(imageBuffer).metadata();
    const targetWidth = Math.floor((metadata.width || 1000) * 0.5); // 50% downscale
    
    const quickBuffer = await sharp(imageBuffer)
      .resize({ width: targetWidth, kernel: 'nearest' })  // Downscale with nearest-neighbor
      .resize({ width: metadata.width, kernel: 'nearest' }) // Upscale back (pixelates)
      .grayscale()
      .blur(1.5)          // Heavy blur to merge lines and kill small details
      .normalize()
      .threshold(220)     // Very aggressive threshold for thick outlines
      .png()
      .toBuffer();

    const quickPath = `${page.book_id}/${page.id}-quick.png`;
    const { error: quickError } = await supabase.storage
      .from('book-images')
      .upload(quickPath, quickBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (quickError) {
      console.error('Error storing quick image:', quickError);
      throw quickError;
    }

    const { data: { publicUrl: quickUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(quickPath);

    console.log('✓ Quick & Easy version stored at:', quickUrl);

    // ===== STEP 4: Determine which URL to return based on difficulty =====
    let coloringImageUrl = intermediateUrl;
    if (difficulty === 'beginner') {
      coloringImageUrl = beginnerUrl;
    } else if (difficulty === 'quick') {
      coloringImageUrl = quickUrl;
    }

    console.log(`Selected ${difficulty} URL for display:`, coloringImageUrl);

    // Update page with all three URLs
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        intermediate_image_url: intermediateUrl,  // Raw Mimi master
        beginner_image_url: beginnerUrl,          // Light simplification
        easy_image_url: quickUrl,                 // Heavy simplification
        coloring_image_url: coloringImageUrl,     // Selected based on book difficulty
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

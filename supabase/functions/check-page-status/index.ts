import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { initializeImageMagick, ImageMagick, MagickFormat, Percentage } from "https://esm.sh/@imagemagick/magick-wasm@0.0.30";

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

    // Download master image from Mimi Panda
    console.log('Downloading master image from Mimi...');
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download master image: ${imageResponse.status}`);
    }
    const masterBuffer = new Uint8Array(await imageResponse.arrayBuffer());
    console.log('Master image downloaded, size:', masterBuffer.length, 'bytes');

    // Initialize ImageMagick
    const wasmUrl = 'https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.30/dist/magick.wasm';
    const wasmBytes = await fetch(wasmUrl).then(r => r.arrayBuffer());
    await initializeImageMagick(wasmBytes);
    console.log('ImageMagick initialized');

    // Generate 3 difficulty variants
    const variants: { [key: string]: Uint8Array } = {};
    
    try {
      // Intermediate: Mimi output with minimal cleanup
      ImageMagick.read(masterBuffer, (img) => {
        img.normalize();
        img.threshold(new Percentage(60)); // 60% threshold for crisp lines
        img.write(MagickFormat.Png, (data) => {
          variants.intermediate = data;
        });
      });
      console.log('✓ Intermediate variant generated');

      // Beginner: Light simplification
      ImageMagick.read(masterBuffer, (img) => {
        img.blur(1.0, 0.8); // Light blur to remove micro-noise
        img.normalize();
        img.threshold(new Percentage(70)); // Stronger threshold for bolder lines
        img.write(MagickFormat.Png, (data) => {
          variants.beginner = data;
        });
      });
      console.log('✓ Beginner variant generated');

      // Quick & Easy: Heavy simplification
      ImageMagick.read(masterBuffer, (img) => {
        const origWidth = img.width;
        // Downscale to merge tiny features
        img.resize(Math.round(origWidth * 0.55), 0);
        img.blur(2.5, 1.4); // Strong blur for main contours only
        img.normalize();
        img.threshold(new Percentage(80)); // Aggressive threshold for thick outlines
        // Upscale back to original size
        img.resize(origWidth, 0);
        img.write(MagickFormat.Png, (data) => {
          variants.easy = data;
        });
      });
      console.log('✓ Quick & Easy variant generated');
    } catch (processingError) {
      console.error('Image processing error:', processingError);
      throw new Error(`Failed to generate variants: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
    }

    // Upload variants to storage
    console.log('Uploading variants to storage...');
    const uploadPromises = Object.entries(variants).map(async ([variant, buffer]) => {
      const fileName = `${page.book_id}/${pageId}-${variant}.png`;
      const { data, error } = await supabase.storage
        .from('book-images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });
      
      if (error) {
        console.error(`Error uploading ${variant}:`, error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('book-images')
        .getPublicUrl(fileName);
      
      return { variant, publicUrl };
    });

    const uploadResults = await Promise.all(uploadPromises);
    const urls: { [key: string]: string } = {};
    uploadResults.forEach(({ variant, publicUrl }) => {
      urls[variant] = publicUrl;
    });
    console.log('✓ All variants uploaded:', urls);

    // Map difficulty to the correct URL
    const difficulty = page.books?.difficulty || 'intermediate';
    let coloringImageUrl = urls.intermediate;
    if (difficulty === 'quick-easy' || difficulty === 'quick') coloringImageUrl = urls.easy;
    if (difficulty === 'beginner') coloringImageUrl = urls.beginner;
    if (difficulty === 'advanced') coloringImageUrl = urls.intermediate; // Advanced maps to Intermediate

    console.log(`Using ${difficulty} variant:`, coloringImageUrl);

    // Update page with all variant URLs
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        easy_image_url: urls.easy,
        beginner_image_url: urls.beginner,
        intermediate_image_url: urls.intermediate,
        coloring_image_url: coloringImageUrl,
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
        success: true,
        coloringImageUrl,
        easyImageUrl: urls.easy,
        beginnerImageUrl: urls.beginner,
        intermediateImageUrl: urls.intermediate,
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

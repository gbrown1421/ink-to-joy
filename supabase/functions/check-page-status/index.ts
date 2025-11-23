import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  Percentage,
} from "https://esm.sh/@imagemagick/magick-wasm@0.0.30";

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

    // Initialize magick-wasm for post-processing
    const wasmUrl = 'https://esm.sh/@imagemagick/magick-wasm@0.0.30/magick.wasm';
    const wasmResponse = await fetch(wasmUrl);
    const wasmBytes = new Uint8Array(await wasmResponse.arrayBuffer());
    await initializeImageMagick(wasmBytes);

    console.log('Generating 3 difficulty variants from Mimi base image...');
    
    // Process variants sequentially to avoid CPU timeout
    // INTERMEDIATE: closest to Mimi output
    console.log('Creating intermediate variant...');
    const intermediateBuffer = await new Promise<Uint8Array>((resolve) => {
      ImageMagick.read(new Uint8Array(imageBuffer), (img) => {
        img.threshold(new Percentage(82));
        resolve(img.write(MagickFormat.Png, data => data));
      });
    });

    // BEGINNER: slightly simplified
    console.log('Creating beginner variant...');
    const beginnerBuffer = await new Promise<Uint8Array>((resolve) => {
      ImageMagick.read(new Uint8Array(imageBuffer), (img) => {
        img.blur(0.5, 0.5);
        img.threshold(new Percentage(80));
        resolve(img.write(MagickFormat.Png, data => data));
      });
    });

    // QUICK: very chunky for toddlers
    console.log('Creating quick variant...');
    const quickBuffer = await new Promise<Uint8Array>((resolve) => {
      ImageMagick.read(new Uint8Array(imageBuffer), (img) => {
        const width = img.width;
        const height = img.height;
        const quickScale = 0.5;
        
        img.blur(1.0, 1.0);
        img.resize(Math.round(width * quickScale), Math.round(height * quickScale));
        img.resize(width, height);
        img.threshold(new Percentage(85));
        resolve(img.write(MagickFormat.Png, data => data));
      });
    });

    // Upload all 3 variants to storage
    console.log('Uploading all 3 variants to storage...');
    const basePath = `${page.book_id}/${page.id}`;
    
    const [quickUpload, beginnerUpload, intermediateUpload] = await Promise.all([
      supabase.storage.from('book-images').upload(`${basePath}-quick.png`, quickBuffer, {
        contentType: 'image/png',
        upsert: true,
      }),
      supabase.storage.from('book-images').upload(`${basePath}-beginner.png`, beginnerBuffer, {
        contentType: 'image/png',
        upsert: true,
      }),
      supabase.storage.from('book-images').upload(`${basePath}-intermediate.png`, intermediateBuffer, {
        contentType: 'image/png',
        upsert: true,
      }),
    ]);

    if (quickUpload.error || beginnerUpload.error || intermediateUpload.error) {
      console.error('Error uploading variants:', { quickUpload, beginnerUpload, intermediateUpload });
      throw new Error('Failed to upload one or more difficulty variants');
    }

    const { data: { publicUrl: quickUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(`${basePath}-quick.png`);
    
    const { data: { publicUrl: beginnerUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(`${basePath}-beginner.png`);
    
    const { data: { publicUrl: intermediateUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(`${basePath}-intermediate.png`);

    console.log('✓ All variants uploaded:', { quickUrl, beginnerUrl, intermediateUrl });

    // Map difficulty to the correct URL
    const difficulty = page.books?.difficulty || 'intermediate';
    let coloringImageUrl = intermediateUrl;
    if (difficulty === 'quick') coloringImageUrl = quickUrl;
    if (difficulty === 'beginner') coloringImageUrl = beginnerUrl;

    console.log(`Using ${difficulty} variant:`, coloringImageUrl);

    // Update page with all variant URLs
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        easy_image_url: quickUrl,
        beginner_image_url: beginnerUrl,
        intermediate_image_url: intermediateUrl,
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
        coloringImageUrl,
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

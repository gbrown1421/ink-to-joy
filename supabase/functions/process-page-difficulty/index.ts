import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * POST-PROCESSES the Mimi Panda "Intermediate" (V2 Simplified) image 
 * to create Beginner and Quick & Easy versions.
 * 
 * Difficulty mapping:
 * - Intermediate: Use Mimi V2 Simplified directly (clean, bold line art)
 * - Beginner: Light simplification - slightly thicken lines, drop noise
 * - Quick & Easy: Aggressive simplification - keep only major shapes
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pageId, intermediateImageUrl } = await req.json();

    if (!pageId || !intermediateImageUrl) {
      return new Response(
        JSON.stringify({ error: 'pageId and intermediateImageUrl required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== PROCESSING DIFFICULTY VERSIONS ===');
    console.log('Page ID:', pageId);
    console.log('Intermediate URL:', intermediateImageUrl);

    // Fetch the intermediate (Mimi V2 Simplified) image
    const imageResponse = await fetch(intermediateImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch intermediate image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    console.log('Fetched intermediate image:', imageBuffer.byteLength, 'bytes');

    // Import sharp for server-side image processing
    // Sharp provides high-quality image manipulation
    const sharp = (await import('https://deno.land/x/sharp@v0.33.2/mod.ts')).default;

    const baseImage = sharp(imageBuffer);
    const metadata = await baseImage.metadata();
    
    console.log('Image dimensions:', metadata.width, 'x', metadata.height);

    // BEGINNER: Light simplification
    // Strategy: Small blur + threshold to slightly thicken lines and remove fine noise
    console.log('Generating BEGINNER version...');
    const beginnerBuffer = await sharp(imageBuffer)
      .grayscale()
      .blur(0.5)  // Very light blur
      .normalize()  // Stretch histogram
      .threshold(200)  // Convert to pure black/white
      .png()
      .toBuffer();

    console.log('Beginner version created:', beginnerBuffer.byteLength, 'bytes');

    // QUICK & EASY: Aggressive simplification  
    // Strategy: Larger blur + threshold + morphology to keep only bold shapes
    console.log('Generating QUICK & EASY version...');
    const easyBuffer = await sharp(imageBuffer)
      .grayscale()
      .blur(1.5)  // More aggressive blur to merge nearby lines
      .normalize()
      .threshold(220)  // Higher threshold = thicker lines
      .png()
      .toBuffer();

    console.log('Quick & Easy version created:', easyBuffer.byteLength, 'bytes');

    // Upload processed versions to storage
    const beginnerPath = `${pageId}/beginner.png`;
    const easyPath = `${pageId}/easy.png`;

    console.log('Uploading to storage...');

    const { error: beginnerError } = await supabase.storage
      .from('book-images')
      .upload(beginnerPath, beginnerBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (beginnerError) {
      console.error('Beginner upload error:', beginnerError);
      throw beginnerError;
    }

    const { error: easyError } = await supabase.storage
      .from('book-images')
      .upload(easyPath, easyBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (easyError) {
      console.error('Easy upload error:', easyError);
      throw easyError;
    }

    // Get public URLs
    const { data: { publicUrl: beginnerUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(beginnerPath);

    const { data: { publicUrl: easyUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(easyPath);

    console.log('Beginner URL:', beginnerUrl);
    console.log('Easy URL:', easyUrl);

    // Update page record with all three difficulty URLs
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        beginner_image_url: beginnerUrl,
        easy_image_url: easyUrl,
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('Page update error:', updateError);
      throw updateError;
    }

    console.log('=== PROCESSING COMPLETE ===');

    return new Response(
      JSON.stringify({ 
        success: true,
        beginnerUrl,
        easyUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-page-difficulty:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import sharp from "https://esm.sh/sharp@0.33.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generates difficulty-specific variant from master image (intermediate_image_url)
 * Only generates the variant matching the book's difficulty setting
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { pageId } = await req.json();

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: 'Page ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get page and book info
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

    const difficulty = page.books.difficulty;
    const masterUrl = page.intermediate_image_url;

    if (!masterUrl) {
      return new Response(
        JSON.stringify({ error: 'Master image not yet available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ${difficulty} variant for page ${pageId}`);

    // If intermediate, no processing needed - master IS the image
    if (difficulty === 'intermediate') {
      return new Response(
        JSON.stringify({
          success: true,
          difficulty,
          imageUrl: masterUrl,
          message: 'Using master image for intermediate difficulty',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch master image
    const imageResponse = await fetch(masterUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch master image');
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    let processedBuffer: Uint8Array;
    let variantField: string;
    let filename: string;

    if (difficulty === 'beginner') {
      // Check if already generated
      if (page.beginner_image_url) {
        return new Response(
          JSON.stringify({
            success: true,
            difficulty,
            imageUrl: page.beginner_image_url,
            message: 'Beginner variant already exists',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Light simplification: mild blur + contrast
      const scaled = await sharp(imageBuffer)
        .resize({ width: Math.floor(1024 * 0.75) })
        .toBuffer();

      processedBuffer = await sharp(scaled)
        .blur(1)
        .linear(1.4, 0) // contrast increase
        .resize({ width: 1024 })
        .png()
        .toBuffer();

      variantField = 'beginner_image_url';
      filename = `${pageId}-beginner.png`;
    } else if (difficulty === 'quick' || difficulty === 'quick-easy' || difficulty === 'quick_easy' || difficulty === 'easy') {
      // Check if already generated
      if (page.easy_image_url) {
        return new Response(
          JSON.stringify({
            success: true,
            difficulty,
            imageUrl: page.easy_image_url,
            message: 'Quick variant already exists',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Heavy simplification: aggressive downscale + blur + contrast
      const scaled = await sharp(imageBuffer)
        .resize({ width: Math.floor(1024 * 0.45) })
        .toBuffer();

      processedBuffer = await sharp(scaled)
        .blur(2.5)
        .linear(1.6, 0) // stronger contrast
        .resize({ width: 1024 })
        .png()
        .toBuffer();

      variantField = 'easy_image_url';
      filename = `${pageId}-quick.png`;
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown difficulty: ${difficulty}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload processed variant
    const storagePath = `books/${page.book_id}/pages/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from('book-images')
      .upload(storagePath, processedBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('book-images')
      .getPublicUrl(storagePath);

    const variantUrl = urlData.publicUrl;

    // Update page with variant URL
    const updateData: any = {};
    updateData[variantField] = variantUrl;

    const { error: updateError } = await supabase
      .from('pages')
      .update(updateData)
      .eq('id', pageId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log(`✓ ${difficulty} variant generated: ${variantUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        difficulty,
        imageUrl: variantUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating variant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
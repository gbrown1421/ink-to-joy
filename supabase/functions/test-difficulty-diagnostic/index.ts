import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * DIAGNOSTIC TOOL: Tests difficulty processing with a sample image.
 * 
 * Usage: GET /functions/v1/test-difficulty-diagnostic?imageUrl=<url>
 * 
 * This will:
 * 1. Fetch the test image
 * 2. Call Mimi with V2 Simplified (our Intermediate base)
 * 3. Generate Beginner and Quick & Easy versions
 * 4. Return all three URLs for visual inspection
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('imageUrl');

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'imageUrl query parameter required',
          example: '/functions/v1/test-difficulty-diagnostic?imageUrl=https://...'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('=== DIAGNOSTIC TEST START ===');
    console.log('Test image URL:', imageUrl);

    // Fetch test image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch test image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    console.log('Fetched test image:', imageBlob.size, 'bytes');

    // Submit to Mimi Panda (V2 Simplified)
    const apiToken = Deno.env.get('MIMI_PANDA_API_TOKEN');
    const mimiFormData = new FormData();
    mimiFormData.append('image', imageBlob, 'test.jpg');
    mimiFormData.append('version', 'v2');
    mimiFormData.append('type', 'v2_simplified');

    console.log('Submitting to Mimi Panda...');
    const mimiResponse = await fetch('https://mimi-panda.com/api/service/coloring', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
      body: mimiFormData,
    });

    if (!mimiResponse.ok) {
      const errorText = await mimiResponse.text();
      throw new Error(`Mimi API error: ${mimiResponse.status} - ${errorText}`);
    }

    const mimiData = await mimiResponse.json();
    const mimiKey = mimiData.key;
    console.log('Mimi job created:', mimiKey);

    // Poll for completion (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 12;
    let completed = false;
    let resultUrl = '';

    while (attempts < maxAttempts && !completed) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      
      const statusResponse = await fetch(`https://mimi-panda.com/api/service/item/${mimiKey}`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('Status:', statusData.status);
        
        if (statusData.status === 'completed') {
          completed = true;
          resultUrl = statusData.result_url;
          console.log('Mimi completed! Result:', resultUrl);
        }
      }
    }

    if (!completed) {
      throw new Error('Mimi processing timed out');
    }

    // Download intermediate result
    const intermediateResponse = await fetch(resultUrl);
    const intermediateBuffer = await intermediateResponse.arrayBuffer();
    
    console.log('Downloaded intermediate result:', intermediateBuffer.byteLength, 'bytes');

    // Process for different difficulties using sharp
    const sharp = (await import('https://deno.land/x/sharp@v0.33.2/mod.ts')).default;

    // Intermediate (Mimi V2 Simplified - no processing)
    const intermediatePath = `diagnostic/intermediate-${Date.now()}.png`;
    await supabase.storage
      .from('book-images')
      .upload(intermediatePath, intermediateBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    // Beginner (light simplification)
    console.log('Generating Beginner version...');
    const beginnerBuffer = await sharp(intermediateBuffer)
      .grayscale()
      .blur(0.5)
      .normalize()
      .threshold(200)
      .png()
      .toBuffer();

    const beginnerPath = `diagnostic/beginner-${Date.now()}.png`;
    await supabase.storage
      .from('book-images')
      .upload(beginnerPath, beginnerBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    // Quick & Easy (aggressive simplification)
    console.log('Generating Quick & Easy version...');
    const easyBuffer = await sharp(intermediateBuffer)
      .grayscale()
      .blur(1.5)
      .normalize()
      .threshold(220)
      .png()
      .toBuffer();

    const easyPath = `diagnostic/easy-${Date.now()}.png`;
    await supabase.storage
      .from('book-images')
      .upload(easyPath, easyBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    // Get public URLs
    const { data: { publicUrl: intermediateUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(intermediatePath);

    const { data: { publicUrl: beginnerUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(beginnerPath);

    const { data: { publicUrl: easyUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(easyPath);

    console.log('=== DIAGNOSTIC TEST COMPLETE ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All difficulty versions generated successfully',
        results: {
          'Intermediate (Mimi V2 Simplified)': intermediateUrl,
          'Beginner (Light Simplification)': beginnerUrl,
          'Quick & Easy (Aggressive Simplification)': easyUrl,
        },
        instructions: 'Open each URL in your browser to compare the results',
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Diagnostic error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// fal.ai Lineart Configuration
const FAL_AI_API_URL = 'https://fal.run/fal-ai/image-preprocessors/lineart';

// Difficulty → coarseness mapping
// Lower coarseness = more detail, Higher coarseness = simpler lines
const difficultyToCoarseness: Record<string, number> = {
  quick: 0.8,        // Very simple for toddlers
  beginner: 0.6,     // Simple lines
  intermediate: 0.4, // Moderate detail
  advanced: 0.2      // Fine detail
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

    const formData = await req.formData();
    const bookId = formData.get('bookId') as string;
    const imageFile = formData.get('image') as File;

    if (!bookId || !imageFile) {
      return new Response(
        JSON.stringify({ error: 'Book ID and image are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get book to determine difficulty and project type
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('difficulty, project_type')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return new Response(
        JSON.stringify({ error: 'Book not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload original image to Supabase Storage
    const fileName = `${bookId}/${crypto.randomUUID()}-${imageFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('book-images')
      .upload(fileName, imageFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(fileName);

    // Get next order index
    const { count } = await supabase
      .from('pages')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId);

    const orderIndex = (count ?? 0) + 1;

    // Route based on project type
    if (book.project_type === 'toon') {
      // For toon projects, delegate to generate-toon-image function
      const toonFormData = new FormData();
      toonFormData.append('bookId', bookId);
      toonFormData.append('image', imageFile);

      const toonResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-toon-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: toonFormData,
        }
      );

      if (!toonResponse.ok) {
        const errorText = await toonResponse.text();
        console.error('Toon generation error:', errorText);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to generate toon image',
            details: errorText
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const toonData = await toonResponse.json();
      return new Response(
        JSON.stringify({ pageId: toonData.pageId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit to fal.ai API for coloring book projects
    const apiKey = Deno.env.get('FAL_AI_API_KEY');
    const coarseness = difficultyToCoarseness[book.difficulty] || 0.6;
    
    console.log('=== FAL.AI API REQUEST ===');
    console.log('API Key configured:', !!apiKey);
    console.log('API URL:', FAL_AI_API_URL);
    console.log('Book difficulty:', book.difficulty);
    console.log('Coarseness:', coarseness);
    console.log('Image name:', imageFile.name);
    console.log('Image size:', imageFile.size, 'bytes');
    console.log('Image type:', imageFile.type);
    
    if (!apiKey) {
      console.error('FAL_AI_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending request to fal.ai...');
    const falResponse = await fetch(FAL_AI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: publicUrl,
        coarseness: coarseness,
        detect_resolution: 1024,
        image_resolution: 1024
      }),
    });

    console.log('=== FAL.AI API RESPONSE ===');
    console.log('Status:', falResponse.status);
    console.log('Status Text:', falResponse.statusText);
    console.log('Content-Type:', falResponse.headers.get('content-type'));
    
    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('fal.ai API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create lineart',
          details: errorText,
          status: falResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const falData = await falResponse.json();
    console.log('fal.ai response:', JSON.stringify(falData, null, 2));
    
    const lineartUrl = falData.image?.url;
    
    if (!lineartUrl) {
      throw new Error('No image URL returned from fal.ai');
    }

    console.log('Lineart URL:', lineartUrl);

    // Download lineart and upload to our storage
    const lineartResponse = await fetch(lineartUrl);
    if (!lineartResponse.ok) {
      throw new Error(`Failed to download lineart: ${lineartResponse.statusText}`);
    }

    const lineartBlob = await lineartResponse.blob();
    const lineartFilename = `${crypto.randomUUID()}-lineart.png`;
    const lineartPath = `books/${bookId}/pages/${lineartFilename}`;

    console.log('Uploading lineart to storage:', lineartPath);
    const { error: lineartUploadError } = await supabase.storage
      .from('book-images')
      .upload(lineartPath, lineartBlob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (lineartUploadError) {
      console.error('Failed to upload lineart:', lineartUploadError);
      throw lineartUploadError;
    }

    // Get public URL
    const { data: lineartUrlData } = supabase.storage
      .from('book-images')
      .getPublicUrl(lineartPath);

    const intermediateImageUrl = lineartUrlData.publicUrl;
    console.log('Lineart uploaded:', intermediateImageUrl);

    // Create page record with status=ready (fal.ai is synchronous)
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        book_id: bookId,
        original_image_url: publicUrl,
        intermediate_image_url: intermediateImageUrl,
        status: 'ready',
        page_order: orderIndex,
      })
      .select()
      .single();

    if (pageError) {
      console.error('Error creating page:', pageError);
      return new Response(
        JSON.stringify({ error: pageError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✓ Page created and ready:', page.id);

    return new Response(
      JSON.stringify({ pageId: page.id, status: 'ready' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upload-page:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

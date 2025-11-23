import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mimi Panda API Configuration
// This matches the exact API call from mimi-panda.com website when using "Version 2 → Simplified (for kids)"
const MIMI_PANDA_API_URL = 'https://mimi-panda.com/api/service/coloring';

// DIFFICULTY PROCESSING PIPELINE - Using Mimi's native modes:
// - Quick & Easy: v2_simplified (simple outlines for toddlers)
// - Beginner: v2_general (fewer details, good facial detail)
// - Intermediate: v2_comic (cartoon outlines)
// We call the appropriate Mimi mode based on book difficulty, no post-processing needed

// Mimi Panda type mapping (matching website options):
// - v2_general: "General" mode - fewer details and good facial detail
// - v2_simplified: "Simplified" mode - simple outlines, perfect for kids
// - v2_detailed: "Detailed" mode - precise outlines, details, and faces
// - v2_comic: "Comic" mode - cartoon style outlines
// - v2_anime: "Anime" style mode
// - v2_sketch: "Sketch" mode - preserves natural style

// Type mapping for reference (not currently used - all difficulties use v2_simplified):
// - v2_general: "General" mode
// - v2_simplified: "Simplified (for kids)" mode ← WE USE THIS
// - v2_detailed: "Detailed (for adults)" mode

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

    // Submit to Mimi Panda API for coloring book projects
    const apiToken = Deno.env.get('MIMI_PANDA_API_TOKEN');
    
    // Map difficulty to Mimi Panda type
    const mimiType = book.difficulty === 'quick' 
      ? 'v2_simplified'  // Simple outlines for toddlers
      : book.difficulty === 'beginner'
      ? 'v2_general'     // Fewer details, good facial detail
      : 'v2_comic';      // Cartoon outlines for intermediate
    
    // Debug logging
    console.log('=== MIMI PANDA API REQUEST ===');
    console.log('API Token configured:', !!apiToken);
    console.log('API URL:', MIMI_PANDA_API_URL);
    console.log('Book difficulty:', book.difficulty);
    console.log('Mimi type:', mimiType);
    console.log('Image name:', imageFile.name);
    console.log('Image size:', imageFile.size, 'bytes');
    console.log('Image type:', imageFile.type);
    
    if (!apiToken) {
      console.error('MIMI_PANDA_API_TOKEN is not set');
      return new Response(
        JSON.stringify({ error: 'API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const mimiFormData = new FormData();
    mimiFormData.append('image', imageFile);
    mimiFormData.append('version', 'v2');
    mimiFormData.append('type', mimiType);

    console.log('Sending request to Mimi Panda API (matching website behavior)...');
    const mimiResponse = await fetch(MIMI_PANDA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
      body: mimiFormData,
    });

    console.log('=== MIMI PANDA API RESPONSE ===');
    console.log('Status:', mimiResponse.status);
    console.log('Status Text:', mimiResponse.statusText);
    console.log('Content-Type:', mimiResponse.headers.get('content-type'));
    
    if (!mimiResponse.ok) {
      const errorText = await mimiResponse.text();
      console.error('Mimi Panda API error:', errorText);
      console.error('Response headers:', Object.fromEntries(mimiResponse.headers.entries()));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create coloring job',
          details: errorText,
          status: mimiResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mimiData = await mimiResponse.json();
    const mimiKey = mimiData.key;
    
    console.log('Mimi job created with key:', mimiKey);
    console.log('Full Mimi response:', JSON.stringify(mimiData, null, 2));

    // Create page record with status=processing
    // The check-page-status function will poll Mimi API and update when ready
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        book_id: bookId,
        original_image_url: publicUrl,
        mimi_key: mimiKey,
        status: 'processing',
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

    return new Response(
      JSON.stringify({ pageId: page.id, mimiKey }),
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

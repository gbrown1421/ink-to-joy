import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get book to determine difficulty
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('difficulty')
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

    // Generate cartoon/toon image using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert image to base64 for AI processing
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // Determine style based on difficulty
    const stylePrompts = {
      "quick-easy": "very simple, bold cartoon with minimal details",
      "beginner": "cartoon style with clean, simple lines",
      "intermediate": "detailed cartoon caricature with expressive features",
      "advanced": "highly detailed cartoon caricature with intricate linework"
    };

    const styleDescription = stylePrompts[book.difficulty as keyof typeof stylePrompts] || stylePrompts.beginner;

    const prompt = `Create a black and white line-art cartoon caricature of the person(s), pet(s), or subject(s) in this photo. 
Style: ${styleDescription}
Requirements:
- Keep the same pose, clothing, and setting from the original photo
- Use clean, bold black outlines with no shading or gradients
- Make features slightly exaggerated and expressive (larger eyes, friendly expression)
- Kid-friendly and appropriate for a coloring book page
- White background only
- No text, labels, or watermarks
- High contrast black lines on white background perfect for coloring`;

    console.log('Generating toon image with Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate cartoon image',
          details: errorText,
          status: aiResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error('No image generated from AI');
      return new Response(
        JSON.stringify({ error: 'No image generated from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload the generated toon image to storage
    const base64Data = generatedImageUrl.split(',')[1];
    const toonImageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const toonFileName = `${bookId}/toon-${crypto.randomUUID()}.png`;
    
    const { error: toonUploadError } = await supabase.storage
      .from('book-images')
      .upload(toonFileName, toonImageBuffer, {
        contentType: 'image/png'
      });

    if (toonUploadError) {
      console.error('Error uploading toon image:', toonUploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload generated image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl: toonPublicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(toonFileName);

    // Create page record with the toon image
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        book_id: bookId,
        original_image_url: publicUrl,
        coloring_image_url: toonPublicUrl,
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

    return new Response(
      JSON.stringify({ pageId: page.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-toon-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

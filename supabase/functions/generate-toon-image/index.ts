import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ToonDifficulty = "Quick and Easy" | "Adv Beginner";

function buildCartoonPrompt(difficulty: ToonDifficulty): string {
  if (difficulty === "Quick and Easy") {
    return `
Turn the uploaded reference photo into a kid friendly, full color 2D cartoon illustration.

Rules:
- Keep the same people, poses, outfits, and general layout as the photo.
- Style must be clean 2D cartoon or storybook illustration, not 3D, not photorealistic.
- Faces must be friendly and expressive with kid safe proportions and no uncanny look.
- Use bright, cheerful colors with clear separation between shapes.
- Do not include any text, logos, or brand marks.

Complexity for Quick and Easy:
- Characters:
  - Slightly larger heads and simplified facial features.
  - Clothing simplified into big, flat color areas with very few folds and no tiny patterns.
- Background:
  - Very simple and uncluttered.
  - Keep only a few large shapes to hint at the environment, such as one wall shape, a simple floor, one big window, or one large furniture shape.
  - Remove small objects, scattered toys, loose papers, and any busy detail.
- Lines and color:
  - Thick, bold outlines around characters and main shapes.
  - Mostly flat colors with at most very soft minimal shading on large areas.
  - Large open areas of single color so the scene is easy to read at a glance.
- Overall:
  - The image should look calm, clean, and simple, suitable for very young kids.
`.trim();
  }

  // Adv Beginner
  return `
Turn the uploaded reference photo into a kid friendly, full color 2D cartoon illustration.

Rules:
- Keep the same people, poses, outfits, and general layout as the photo.
- Style must be clean 2D cartoon or storybook illustration, not 3D, not photorealistic.
- Faces must be friendly and expressive with kid safe proportions and no uncanny look.
- Use bright, cheerful colors with clear separation between shapes.
- Do not include any text, logos, or brand marks.

Complexity for Adv Beginner:
- Characters:
  - Standard cartoon proportions, not chibi and not hyper realistic.
  - Clear facial features and hair details without tiny noisy lines.
  - Clothing can include simple patterns such as stripes or small shapes and a few folds and overlaps.
- Background:
  - Show a recognizable scene based on the photo such as a classroom or playroom.
  - Include key furniture and a limited number of background objects, but avoid extreme clutter.
  - Use larger shapes and clear silhouettes and keep tiny background items to a minimum.
- Lines and color:
  - Medium weight outlines, cleaner and a bit finer than Quick and Easy.
  - Simple soft shading is allowed, with light shadows and highlights to give gentle depth.
  - Colors remain bright, fun, and kid friendly rather than dark or edgy.
- Overall:
  - The image should look richer and more detailed than Quick and Easy, but still clean and easy to read for early elementary age kids.
`.trim();
}

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

    // Build cartoon prompt based on difficulty
    const toonDifficulty = book.difficulty as ToonDifficulty;
    
    if (toonDifficulty !== "Quick and Easy" && toonDifficulty !== "Adv Beginner") {
      console.error(`Invalid toon difficulty: ${book.difficulty}`);
      return new Response(
        JSON.stringify({ error: `Invalid toon difficulty: ${book.difficulty}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildCartoonPrompt(toonDifficulty);

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

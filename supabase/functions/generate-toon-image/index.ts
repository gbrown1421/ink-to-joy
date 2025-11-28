import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BookDifficulty = "Quick and Easy" | "Beginner" | "Intermediate";
type ToonDifficulty = 'quick' | 'adv-beginner';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000; // Process 32KB at a time to avoid stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
}

function buildCartoonPrompt(difficulty: ToonDifficulty): string {
  const base = `
You are creating a BLACK-AND-WHITE CARTOON COLORING PAGE from a classroom reference photo.

GLOBAL STYLE (ALWAYS):
- 2D cartoon style, like a kids' TV show or picture-book illustration (think Cocomelon / Nick Jr style).
- Children are simplified cartoons, NOT realistic portraits.
- Proportions:
  - Big heads (about one third of total body height).
  - Big round eyes, simple eyebrows, tiny nose, big friendly smile.
  - Hands are simple shapes, not detailed fingers.
- Clean, solid BLACK outlines on pure WHITE background.
- NO color, NO gray shading, NO gradients, NO pencil texture, NO hatching.
- Use the photo ONLY for rough poses and positions, not for background detail or realism.
- Do NOT trace the photo; redraw everything in a clean cartoon style.
`;

  const quick = `
QUICK AND EASY CARTOON (for 3–6 year olds).

HARD RULES – IF YOU BREAK THESE, THE IMAGE IS WRONG:
- Four kids, full body, head-to-toe, clearly visible.
- EXAGGERATED cartoon:
  - Heads clearly oversized (20–30% bigger than normal).
  - Very big eyes, simple mouths, minimal face lines.
  - Clothing drawn with BIG, simple shapes and almost no inner details.
- BACKGROUND MUST BE ALMOST COMPLETELY BLANK:
  - A single straight floor line under their feet is allowed.
  - AT MOST ONE simple background shape (for example: ONE star OR ONE picture frame). 
  - NO shelves, NO toys, NO tables, NO chairs, NO rugs, NO stacks of objects, NO busy classroom.
- LINES:
  - Outer contour lines should be VERY THICK and bold.
  - Inside lines (for facial features and clothing) should be simple and chunky, not tiny.
- Large open white areas so a young child using a thick marker can color without hitting tiny gaps.
- ABSOLUTELY NO shading, cross-hatching, textures, or grey areas.

If you are about to draw ANY extra background object (like shelves, toys, classroom clutter, detailed windows, patterned rugs, many small wall shapes), DO NOT DRAW IT. Replace it with blank white space instead.
`;

  const advBeginner = `
ADVANCED BEGINNER CARTOON (between Beginner and Intermediate).

- Four kids, full body, head-to-toe, in the same cartoon style:
  - Big heads, big eyes, simplified hair and clothing.
- Simple but recognizable classroom background:
  - Only a FEW big shapes: for example, one rug, one shelf, one window, and 2–3 large posters or stars.
  - NO tiny toys everywhere, NO piles of small shapes, NO detailed patterns.
- Line weight:
  - Outer contours medium-thick.
  - Interior detail lines slightly finer but still bold and easy to color.
- Clothing:
  - Can include a few simple patterns (stripes, flowers), but keep them large and clear.
- Still NO grey shading, gradients, or texture – only clean black outlines on white.
`;

  if (difficulty === 'quick') {
    return `${base}\n\n${quick}`;
  }

  // Default to advanced beginner cartoon if anything else is passed
  return `${base}\n\n${advBeginner}`;
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

    // Map book difficulty to toon difficulty
    const rawDifficulty = (book.difficulty || 'quick') as string;
    const toonDifficulty: ToonDifficulty =
      rawDifficulty === 'quick' ? 'quick' : 'adv-beginner';

    const prompt = buildCartoonPrompt(toonDifficulty);

    // Debug logging
    console.log('InkToJoy toon prompt difficulty:', toonDifficulty);
    console.log('InkToJoy toon prompt (first 200 chars):', prompt.slice(0, 200));

    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating toon coloring page with OpenAI gpt-image-1...');
    
    // Create FormData for OpenAI image edit endpoint
    const openAIFormData = new FormData();
    openAIFormData.append('image', imageFile);
    openAIFormData.append('prompt', prompt);
    openAIFormData.append('model', 'gpt-image-1');
    openAIFormData.append('n', '1');
    openAIFormData.append('size', '1024x1024');
    
    // Use OpenAI image edit endpoint to convert photo to line art
    const aiResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: openAIFormData
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate toon coloring page',
          details: errorText,
          status: aiResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('OpenAI response received with data');
    
    // OpenAI returns b64_json when using edits endpoint
    const generatedBase64 = aiData.data?.[0]?.b64_json;

    if (!generatedBase64) {
      console.error('No b64_json in response. Full response:', JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: 'No image generated from OpenAI', response: aiData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to buffer for upload
    const toonImageBuffer = Uint8Array.from(atob(generatedBase64), c => c.charCodeAt(0));
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
      JSON.stringify({ 
        pageId: page.id,
        status: 'ready',
        coloringImageUrl: toonPublicUrl
      }),
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

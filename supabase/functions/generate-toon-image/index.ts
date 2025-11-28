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

Global style rules (apply to ALL difficulties):
- 2D cartoon style, like a kids' TV show or picture-book illustration.
- Kids are completely REDRAWN as cartoon characters, not realistic portraits.
- Heads larger than real life (about 20–30% bigger), big expressive eyes, simple noses, friendly smiles.
- Clean, solid BLACK outlines on pure WHITE background.
- NO color, NO gray shading, NO gradients, NO pencil texture.
- Use the photo ONLY for pose, relative positions, and basic clothing – ignore its lighting, textures, and background clutter.
- Do NOT trace the original photo. Simplify shapes heavily.
`;

  const quick = `
QUICK AND EASY CARTOON (for 3–6 year olds).

Hard rules – these override everything else:
- Four kids, full body, head-to-toe, all clearly visible.
- EXAGGERATED cartoon look:
  - Big round heads, big eyes, simple eyebrows, tiny nose, clear smile.
  - Limbs drawn with simple tube shapes, very few folds or inner lines.
- Clothing made of BIG, SIMPLE SHAPES:
  - Almost no inner detail: NO small folds, NO tiny seams, NO texture.
  - If there is a pattern, keep it extremely simple (e.g. a few large shapes).
- Background must be almost completely blank:
  - One straight horizontal floor line under their feet.
  - At MOST one extremely simple background hint (e.g. a plain rectangle for a window OR one big star). 
  - NO shelves, NO toys, NO tables, NO detailed classroom objects, NO rugs, NO tiny decorations.
- Use VERY THICK, BOLD outlines around the kids and main shapes.
- Large open white areas so a toddler with a fat marker can color without hitting lots of tiny gaps.
- Under NO circumstance add hatching, shading, stippling, or grey areas.

If you are about to draw ANY extra background object (like shelves, toys, chairs, complex rugs, many shapes on the wall), DO NOT DRAW IT. Leave that area pure white instead.
`;

  const advBeginner = `
ADVANCED BEGINNER CARTOON (between Beginner and Intermediate).

- Four kids, full body, head-to-toe, with clear cartoon proportions:
  - Large heads, big eyes, simplified hair and clothing.
- Simple but recognizable classroom background:
  - A few BIG objects only (e.g. rug, one shelf, one window, 2–3 toy or poster shapes).
  - Avoid clutter: NO small scattered toys, NO piles of tiny items, NO complex patterns.
- Line weight: medium (thinner than Quick and Easy, thicker than a detailed intermediate page).
- Clothing can have a few simple patterns (e.g. stripes, flowers), but keep edges clear and bold.
- Still NO shading or grey tones. Everything is clean black outlines on white.
`;

  if (difficulty === 'quick') {
    return `${base}\n\n${quick}`;
  }

  // Default to adv-beginner cartoon if anything else is passed
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

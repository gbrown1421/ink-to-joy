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

const TOON_QUICK_PROMPT = `
Create a black-and-white coloring page in a cute 2D cartoon style
based on the uploaded children's photo.

STYLE (this overrides the photo):
- Very simple preschool cartoon look.
- Extra-large round heads (about one-third of total height).
- Big round eyes with large pupils, tiny nose, simple smiling mouth.
- Simple hair made of a few big curved shapes, not realistic strands.
- Bodies short and chunky with simple tube arms and legs.
- Hands drawn as mittens or with only a few visible fingers.

COMPOSITION:
- Exactly four children, full body, standing side by side, facing the viewer.
- All heads and feet must be fully inside the frame (no cropping).

LINE WORK:
- Ultra-thick, bold, clean black outlines.
- No shading, hatching, grey tones, or textures at all.
- Large open white areas for easy coloring.

BACKGROUND (VERY SIMPLE):
- Pure white background with ONE straight horizontal floor line under their feet.
- Do NOT draw any furniture, toys, classroom objects, windows, rugs, or decorations.

This must look like a very simple, toddler-friendly cartoon coloring page,
not a realistic drawing of the photo.
`;

const TOON_ADV_BEGINNER_PROMPT = `
Create a black-and-white coloring page in a cute 2D cartoon style
based on the uploaded children's photo.

STYLE (overrides the photo):
- Preschool 2D cartoon look.
- Large round heads, big expressive eyes, tiny nose and mouth.
- Simplified hair as clean shapes, no fine strands.
- Proportions slightly chibi: shorter bodies, bigger heads, soft rounded features.

COMPOSITION:
- Exactly four children, full body, standing together and facing the viewer.
- All heads and feet fully visible inside the frame.

LINE WORK:
- Medium-thick clean outlines, still very clear and bold.
- No grey shading or cross-hatching – only black outlines on white.
- Add a few simple folds in clothes and a bit more detail than Quick & Easy,
  but keep everything easy to color.

BACKGROUND (MODERATE, BUT NOT BUSY):
- Simple classroom suggestion: at most 3–4 large, clear shapes
  such as a shelf, a window, a star on the wall, or a rug.
- No clutter of tiny objects, papers, or small toys.
- Background lines must be lighter and less dense than the characters so the kids remain the focus.

This should feel like a clean cartoon scene for early elementary kids to color,
NOT a realistic pencil drawing of the original photo.
`;

function buildCartoonPrompt(difficulty: ToonDifficulty): string {
  if (difficulty === 'quick') {
    return TOON_QUICK_PROMPT;
  }
  // For Beginner and Intermediate, use Advanced Beginner toon
  return TOON_ADV_BEGINNER_PROMPT;
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

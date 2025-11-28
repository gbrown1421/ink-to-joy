import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BookDifficulty = "Quick and Easy" | "Beginner" | "Intermediate";
type ToonDifficulty = "Quick and Easy" | "Adv Beginner";

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

function buildToonColoringPrompt(difficulty: ToonDifficulty): string {
  const basePrompt = `
Convert the uploaded photo into a black-and-white line-art coloring page
drawn in a cute 2D cartoon style.

Global rules (ALWAYS obey these):
- Keep the same main subject(s), pose(s), and overall composition as the photo.
- Style: simple 2D cartoon / storybook line art, NOT photorealistic, NOT 3D.
- Output MUST be black outlines on a pure white background.
- NO color anywhere. NO grey shading, gradients, or pencil texture.
- Clear, confident outlines, clean shapes, no sketchy noise.
- Show the full main subject(s) in frame; don't crop important parts off.
`;

  const quickPrompt = `
CARTOON COLORING PAGE → QUICK AND EASY

Target: very young kids; maximum simplicity.

- Characters / main subject:
  - Slightly larger cartoon heads, simplified faces (simple eyes, tiny nose, friendly smile).
  - Clothing simplified into big flat areas; remove tiny folds, textures, and small accessories.
- Lines:
  - THICK, bold outlines around characters and key shapes.
  - Very few internal details; avoid tiny lines on hair, clothes, or objects.
- Background:
  - Extremely minimal.
  - Keep at most 1–2 large simple shapes to hint at the setting (e.g. a floor line and one big block shape).
  - Remove small objects, clutter, and fine background detail.
- Absolutely NO hatching, cross-hatching, or grey tones. Only thick black lines on white.
`;

  const advBeginnerPrompt = `
CARTOON COLORING PAGE → ADV BEGINNER

Target: early elementary; more detail, still clean and kid-friendly.

- Characters / main subject:
  - Standard cartoon proportions (not chibi, not realistic).
  - Clear features and hair shape; you can include a few simple folds in clothing.
  - Simple patterns (stripes, flowers, pockets) are OK, but avoid micro-detail.
- Lines:
  - Medium-thick outlines for the main forms, with some internal detail lines.
  - Still NO grey shading or tonal rendering; all information must come from line work.
- Background:
  - Show a simplified version of the real environment (room, outdoors, etc.).
  - Include key large objects (walls, furniture, a few props) but aggressively remove clutter.
  - Prefer bigger, readable shapes over lots of tiny items.
- Overall: more to look at and color than Quick and Easy, but still clean, readable line art with no shading.
`;

  if (difficulty === 'Quick and Easy') {
    return `${basePrompt}\n\n${quickPrompt}`;
  }

  // Adv Beginner
  return `${basePrompt}\n\n${advBeginnerPrompt}`;
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
    const bookDifficulty = book.difficulty as BookDifficulty;
    const toonDifficulty: ToonDifficulty = 
      bookDifficulty === 'Quick and Easy' ? 'Quick and Easy' : 'Adv Beginner';

    const prompt = buildToonColoringPrompt(toonDifficulty);

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
    openAIFormData.append('response_format', 'b64_json');
    
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
    const generatedBase64 = aiData.data?.[0]?.b64_json;

    if (!generatedBase64) {
      console.error('No image generated from OpenAI');
      return new Response(
        JSON.stringify({ error: 'No image generated from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload the generated toon image to storage
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

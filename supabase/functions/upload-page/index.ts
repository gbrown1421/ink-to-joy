import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildColoringPrompt(rawDifficulty: string | null | undefined): string {
  const basePrompt = `
Create a black-and-white line-art coloring page from the uploaded reference image.

General rules:
- Only black outlines on pure white background
- No color, no gray shading, no gradients, no hatching, no pencil texture
- Portrait orientation like an 8.5×11 inch coloring book page
- Keep subjects in frame – don't crop off heads, feet, or important parts
- Clean, printable line art suitable for children to color
`;

  const normalizedDifficulty = (rawDifficulty || "intermediate").toLowerCase().trim();

  let difficultyPrompt: string;

  if (normalizedDifficulty === "quick" || normalizedDifficulty === "easy" || normalizedDifficulty === "quick_easy" || normalizedDifficulty === "quick-easy") {
    difficultyPrompt = `
QUICK & EASY difficulty (for ~3–4 year olds):

- Focus only on the main subject(s) from the image
- Background must be completely BLANK WHITE except for ONE simple straight floor line under the subject's base
- Do NOT draw furniture, shelves, toys, posters, rugs, patterns, or any clutter
- Shapes must be BIG and SIMPLE: no tiny patterns, no stripes, no textures, no small folds
- Faces very simple: basic eyes, small nose, gentle smile – no fine facial detail
- Use THICK, BOLD outlines and large open white areas for easy coloring

If you are about to draw any background object, STOP and leave that area pure white instead.
`;
  } else if (normalizedDifficulty === "beginner" || normalizedDifficulty === "beginners") {
    difficultyPrompt = `
BEGINNER difficulty (for ~4–6 year olds):

- Keep the main subject(s) full-body and clearly outlined
- Background should be VERY SIMPLE and MINIMAL: at most 2–3 LARGE, simple shapes (e.g., one big star, one large framed picture, one simple shelf or window)
- Do NOT draw lots of small objects, tiny toys, papers, or detailed patterns
- Lines medium-thick, very clear, no micro-detail
- If the original scene is cluttered, aggressively simplify it: keep only a few big shapes and erase the rest into blank white space
`;
  } else {
    // default: intermediate
    difficultyPrompt = `
INTERMEDIATE difficulty (for ~6–8 year olds):

- Keep the main subject(s) full-body and recognizable
- Include a recognizable background with more objects and structure than Beginner, but still avoid tiny fussy details that are hard to color
- Use finer lines than Beginner to allow more detail, but keep everything readable and clean
- This version should feel richer and more detailed than Beginner, but still strictly line art for coloring
`;
  }

  return (basePrompt + "\n" + difficultyPrompt).trim();
}

async function processImage(
  supabase: any,
  pageId: string,
  bookId: string,
  imageDataUrl: string,
  book: { difficulty: string }
) {
  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const prompt = buildColoringPrompt(book.difficulty);
    
    console.log('InkToJoy: generating coloring page', {
      bookId,
      difficulty: book.difficulty,
      source: 'generate-coloring-page',
    });
    console.log('InkToJoy: using difficulty suffix', { difficulty: book.difficulty });

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1536', // portrait to keep bodies in frame
        n: 1,
        response_format: 'b64_json'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const base64Image = data.data[0].b64_json;
    
    if (!base64Image) {
      throw new Error('No image generated from OpenAI');
    }

    // Upload the generated coloring page
    const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
    const coloringFileName = `books/${bookId}/pages/${pageId}-${book.difficulty}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('book-images')
      .upload(coloringFileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading coloring image:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(coloringFileName);

    // Update page with the coloring image URL and set status to ready
    const { error: updateError } = await supabase
      .from('pages')
      .update({ 
        coloring_image_url: publicUrl,
        status: 'ready',
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', pageId);

    if (updateError) {
      console.error('Error updating page:', updateError);
      throw updateError;
    }

    console.log('InkToJoy: coloring page ready', { pageId, bookId });
  } catch (error) {
    console.error('Error processing image:', error);
    
    // Update page with error status
    await supabase
      .from('pages')
      .update({ 
        status: 'error',
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', pageId);
  }
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
    const originalFileName = `books/${bookId}/original/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('book-images')
      .upload(originalFileName, imageFile);

    if (uploadError) {
      console.error('Error uploading original image:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl: originalPublicUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(originalFileName);

    // Get next order index
    const { count } = await supabase
      .from('pages')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId);

    const orderIndex = (count ?? 0) + 1;

    // Create page record with status "processing"
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        book_id: bookId,
        original_image_url: originalPublicUrl,
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

    // Convert image to base64 for AI processing (chunked to avoid stack overflow)
    const imageBuffer = await imageFile.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64Image = btoa(binaryString);
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // Start background processing (fire and forget)
    processImage(supabase, page.id, bookId, imageDataUrl, book).catch((err) => {
      console.error('Background processing error:', err);
    });

    // Return immediately with page ID
    return new Response(
      JSON.stringify({ pageId: page.id }),
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
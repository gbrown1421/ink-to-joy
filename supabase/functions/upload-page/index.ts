import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Upload page handler
 * Accepts a photo upload, stores it, and creates a page record for processing
 */

function buildColoringPrompt(difficulty: string): string {
  const basePrompt = `
High-resolution line-art coloring page based on the uploaded photo.

Four preschool children (around 3–5 years old) standing together, full body from head to shoes, facing the viewer, smiling.
Clean black outlines on pure white background, printable for kids.
No color, no shading, no grey tones – only clear black lines.
Portrait orientation, like a US letter 8.5x11 coloring book page.
`;

  const quickSuffix = `
QUICK & EASY TODDLER VERSION (3–4 years old).

CRITICAL RULES:
- Show ONLY the four kids, full body, head to shoes.
- Background must be COMPLETELY BLANK WHITE except for ONE simple horizontal floor line.
- NO classroom, NO furniture, NO toys, NO shelves, NO posters, NO decorations, NO stars, NO extra objects at all.
- Clothes should be big simple shapes: no tiny patterns, no stripes, no textures.
- Use THICK, BOLD outlines and very simple faces (basic eyes, nose, smile).
- Large open white areas for easy coloring.
- ABSOLUTELY NO shading, hatching, or grey areas – just bold black outlines on white.

If you are about to draw ANY background objects (walls, windows, pictures, shelves, toys, stars, rugs, etc.), DO NOT draw them. Leave that area blank white instead.
`;

  const beginnerSuffix = `
BEGINNER VERSION (4–6 years old).

- Keep the four kids full-body and clearly outlined.
- Simple, minimal background: only a few big objects (for example: one large star and one big picture frame) with very little detail.
- Line weight medium-thick, clear outlines, no tiny textures.
- Faces still fairly simple, no fine wrinkles or shading.
- No grey shading or hatching – just black outlines on white.
`;

  const intermediateSuffix = `
INTERMEDIATE VERSION (6–8 years old).

- Keep the four kids full-body.
- Include more of the classroom background, but still as clean line art without cluttered micro-details.
- You can show furniture and decor, but avoid shading and cross-hatching.
- Line weight a bit finer to show more detail, still strictly black outlines on white.
`;

  let difficultySuffix: string;

  if (difficulty === 'quick') {
    difficultySuffix = quickSuffix;
  } else if (difficulty === 'beginner') {
    difficultySuffix = beginnerSuffix;
  } else {
    difficultySuffix = intermediateSuffix;
  }

  return `${basePrompt}\n\n${difficultySuffix}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData = await req.formData();
    const bookId = formData.get('bookId') as string;
    const imageFile = formData.get('image') as File;

    if (!bookId || !imageFile) {
      return new Response(
        JSON.stringify({ error: 'bookId and image are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing upload for book:', bookId);

    // Get book details to determine project type and difficulty
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('project_type, difficulty')
      .eq('id', bookId)
      .single();

    if (bookError) {
      console.error('Book fetch error:', bookError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch book details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get next page order
    const { data: existingPages } = await supabase
      .from('pages')
      .select('page_order')
      .eq('book_id', bookId)
      .order('page_order', { ascending: false })
      .limit(1);

    const nextOrder = existingPages && existingPages.length > 0 
      ? existingPages[0].page_order + 1 
      : 1;

    // Upload original image to storage
    const fileName = `${crypto.randomUUID()}.${imageFile.name.split('.').pop()}`;
    const originalPath = `books/${bookId}/original/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('book-images')
      .upload(originalPath, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl: originalUrl } } = supabase.storage
      .from('book-images')
      .getPublicUrl(originalPath);

    console.log('Original uploaded to:', originalUrl);

    // Create page record with status "processing"
    const { data: newPage, error: pageError } = await supabase
      .from('pages')
      .insert({
        book_id: bookId,
        original_image_url: originalUrl,
        page_order: nextOrder,
        status: 'processing',
      })
      .select()
      .single();

    if (pageError) {
      console.error('Page creation error:', pageError);
      throw new Error('Failed to create page record');
    }

    console.log('Page created:', newPage.id);

    // Only process coloring pages with OpenAI
    if (book.project_type === 'coloring') {
      try {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiKey) {
          throw new Error("OPENAI_API_KEY is not set");
        }

        const difficulty = book.difficulty || "intermediate";
        const prompt = buildColoringPrompt(difficulty);

        console.log('InkToJoy image request', {
          difficulty: book.difficulty,
          size: '1024x1536',
          source: 'generate-coloring-page',
        });
        console.log('Calling OpenAI gpt-image-1 with difficulty:', difficulty);

        // Fetch original image to send to OpenAI
        const originalRes = await fetch(originalUrl);
        if (!originalRes.ok) {
          throw new Error("Failed to fetch original image");
        }
        const originalBlob = await originalRes.blob();

        // Build FormData for OpenAI - request portrait orientation
        const fd = new FormData();
        fd.append("model", "gpt-image-1");
        fd.append("prompt", prompt);
        fd.append("image", new File([originalBlob], "source.png", { type: "image/png" }));
        fd.append("size", "1024x1536"); // Portrait orientation to reduce cropping

        const aiRes = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: fd,
        });

        if (!aiRes.ok) {
          const errorText = await aiRes.text();
          console.error('OpenAI API error:', aiRes.status, errorText);
          throw new Error(`OpenAI API error: ${aiRes.status}`);
        }

        const json = await aiRes.json();
        const b64Json = json?.data?.[0]?.b64_json;
        if (!b64Json) {
          console.error('No b64_json in response. Full response:', JSON.stringify(json, null, 2));
          throw new Error("No image returned from OpenAI");
        }

        console.log('OpenAI returned base64 image, decoding');

        // Decode base64 to binary
        const binary = Uint8Array.from(atob(b64Json), c => c.charCodeAt(0));
        const resultBlob = new Blob([binary], { type: "image/png" });

        // Upload to Supabase Storage
        const resultFilename = `${newPage.id}-${difficulty}.png`;
        const resultPath = `books/${bookId}/pages/${resultFilename}`;

        const { error: resultUploadError } = await supabase.storage
          .from("book-images")
          .upload(resultPath, resultBlob, {
            contentType: "image/png",
            upsert: true,
          });

        if (resultUploadError) {
          console.error('Result storage upload error:', resultUploadError);
          throw resultUploadError;
        }

        const { data: { publicUrl: coloringImageUrl } } = supabase.storage
          .from("book-images")
          .getPublicUrl(resultPath);

        console.log('Coloring image uploaded to:', coloringImageUrl);

        // Update page record to ready
        await supabase
          .from("pages")
          .update({
            coloring_image_url: coloringImageUrl,
            status: "ready",
          })
          .eq("id", newPage.id);

        return new Response(
          JSON.stringify({
            pageId: newPage.id,
            status: "ready",
            coloringImageUrl,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error processing with OpenAI:', error);
        
        // Mark page as failed
        await supabase
          .from('pages')
          .update({ 
            status: 'failed',
          })
          .eq('id', newPage.id);

        return new Response(
          JSON.stringify({ error: 'Image processing failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For toon or other project types, return processing status
    return new Response(
      JSON.stringify({
        pageId: newPage.id,
        status: "processing",
      }),
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

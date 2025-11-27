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
High-resolution line-art coloring page based on the uploaded reference photo.

Four preschool children (around 3–6 years old) standing together, full body from head to shoes, facing the viewer, smiling.
Clean black outlines on a pure white page, printable for kids.
No color, no shading, no grey tones – only clear black lines.
Portrait orientation like an 8.5x11 inch coloring book page.
Camera distance: far enough to clearly show all four kids head-to-toe in frame, without cutting off any feet.
`;

  const quickSuffix = `
QUICK & EASY TODDLER VERSION (3–4 years old).

Rules:
- Show ONLY the four kids, full body, head to shoes.
- Background must be COMPLETELY BLANK WHITE except for ONE simple horizontal floor line under their feet.
- NO classroom, NO furniture, NO toys, NO shelves, NO posters, NO stars, NO decorations, NO extra objects of any kind.
- Clothes should be big simple shapes: no tiny patterns, no stripes, no textures.
- Faces very simple (basic eyes, small nose, friendly smile).
- Use THICK, BOLD outlines and large open white areas for easy coloring.
- ABSOLUTELY NO shading, hatching, or grey areas – just bold black outlines on white.

If you are about to draw ANY background objects (walls, windows, pictures, shelves, toys, stars, rugs, etc.), DO NOT draw them. Leave that area blank white instead.
`;

  const beginnerSuffix = `
BEGINNER VERSION (4–6 years old).

- Keep the four kids full-body and clearly outlined.
- Simple, minimal background: at most 2–3 BIG shapes, like one large star, one picture frame, or one simple toy shelf, with very little detail.
- No cluttered small objects.
- Line weight medium-thick, clear outlines, no tiny textures or micro-details.
- No grey shading or hatching – just black outlines on white.
`;

  const intermediateSuffix = `
INTERMEDIATE VERSION (6–8 years old).

- Keep the four kids full-body.
- Include more of the classroom background with furniture and decor, but still as clean line art without tiny micro-details.
- You can show desks, chairs, shelves, and wall decorations but avoid shading and cross-hatching.
- Line weight finer than Beginner to allow more detail, still strictly black outlines on white.
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

    // Only process coloring pages with OpenAI - do it in background to avoid timeout
    if (book.project_type === 'coloring') {
      // Start background processing - don't await
      const processImage = async () => {
        try {
          const openaiKey = Deno.env.get("OPENAI_API_KEY");
          if (!openaiKey) {
            throw new Error("OPENAI_API_KEY is not set");
          }

          const difficulty = book.difficulty || "intermediate";
          const prompt = buildColoringPrompt(difficulty);

          console.log('InkToJoy: generating coloring page', {
            bookId,
            difficulty: book.difficulty,
            source: 'generate-coloring-page',
          });
          console.log('InkToJoy: using difficulty suffix', { difficulty: book.difficulty });

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

          console.log('Background processing completed for page:', newPage.id);
        } catch (error) {
          console.error('Error processing with OpenAI:', error);
          
          // Mark page as failed
          await supabase
            .from('pages')
            .update({ 
              status: 'failed',
            })
            .eq('id', newPage.id);
        }
      };

      // Start processing in background using EdgeRuntime.waitUntil
      // @ts-ignore - EdgeRuntime is available in Deno Deploy
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(processImage());
      } else {
        // Fallback for local development - just start the promise
        processImage();
      }
    }

    // Return immediately - processing happens in background
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

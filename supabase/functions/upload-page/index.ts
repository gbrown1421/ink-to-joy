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
  const base =
    "Convert this photo into a black-and-white coloring page. " +
    "Redraw it as clean line art with a plain white background, no shading, no grayscale, " +
    "no colors, and no filled areas—just clear black outlines that are easy for kids to color.";

  switch (difficulty) {
    case "quick":
      return (
        base +
        " VERY SIMPLE toddler coloring page for 3–4 year olds. Large shapes, thick lines, " +
        "minimal face detail, minimal background. Remove tiny background objects, clutter, shadows " +
        "and textures. Keep the kids recognizable but with cartoon-simple faces and clothing. " +
        "No hatching, no gray shading, just bold outlines and big areas to color."
      );
    case "beginner":
      return (
        base +
        " Simple kids coloring page for early elementary kids. Medium line thickness, " +
        "basic facial features, simplified background with a few key props. Remove small clutter " +
        "in the background but keep the overall scene. No shading, no textures, just outlines."
      );
    case "intermediate":
    default:
      return (
        base +
        " More detailed kids coloring page. Clean line art with more interior detail in hair, " +
        "clothing, and important background items, but still no shading, hatching, or grayscale. " +
        "White background with only outlines."
      );
  }
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

        console.log('Calling OpenAI gpt-image-1 with difficulty:', difficulty);

        // Fetch original image to send to OpenAI
        const originalRes = await fetch(originalUrl);
        if (!originalRes.ok) {
          throw new Error("Failed to fetch original image");
        }
        const originalBlob = await originalRes.blob();

        // Build FormData for OpenAI
        const fd = new FormData();
        fd.append("model", "gpt-image-1");
        fd.append("prompt", prompt);
        fd.append("image", new File([originalBlob], "source.png", { type: "image/png" }));
        fd.append("size", "1024x1024");

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
        console.log('OpenAI response:', JSON.stringify(json));
        
        const imageUrl = json?.data?.[0]?.url;
        if (!imageUrl) {
          console.error('No URL in response. Full response:', JSON.stringify(json, null, 2));
          throw new Error("No image returned from OpenAI");
        }

        console.log('OpenAI returned image URL, fetching image:', imageUrl);

        // Fetch the image from OpenAI's URL
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
          throw new Error("Failed to fetch generated image from OpenAI");
        }
        const resultBlob = await imageRes.blob();

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

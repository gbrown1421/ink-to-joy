import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Check page status and generate coloring image via OpenAI if needed
 */

function buildColoringPrompt(difficulty: string): string {
  const base =
    "Convert this photo into a black-and-white coloring page. " +
    "Keep the same people, poses, and composition. Use clean black outlines only " +
    "with a pure white background. No gray shading, no color, no filled black areas.";

  switch (difficulty) {
    case "quick":
      return (
        base +
        " Make it ULTRA SIMPLE for toddlers (ages 2–4): very thick outlines, large shapes, " +
        "minimal facial detail, very few background details. No tiny lines."
      );
    case "beginner":
      return (
        base +
        " Make it simple for young kids (ages 4–6): clear outlines, simplified faces and clothes, " +
        "and only a few key background elements. Avoid tiny details and dense patterns."
      );
    case "intermediate":
    default:
      return (
        base +
        " Make it more detailed but still kid-friendly: preserve facial features, clothing details, " +
        "and more of the background, but keep everything as clean line art without any shading."
      );
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    const pageId = body.pageId;

    if (!pageId) {
      return new Response(
        JSON.stringify({ error: 'Page ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get page record with book info
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*, books(*)')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return new Response(
        JSON.stringify({ error: 'Page not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Page status:', page.status);
    
    // If already ready
    if (page.status === 'ready' && page.coloring_image_url) {
      console.log('Page ready with coloring image');
      return new Response(
        JSON.stringify({ 
          status: 'ready', 
          success: true,
          coloringImageUrl: page.coloring_image_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If failed
    if (page.status === 'failed') {
      console.log('Page marked as failed');
      return new Response(
        JSON.stringify({ status: 'failed', success: false, error: 'Processing failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // If processing and not yet generated
    if (page.status === 'processing') {
      // Check if somehow already has URL (race condition)
      if (page.coloring_image_url) {
        await supabase
          .from('pages')
          .update({ status: 'ready' })
          .eq('id', pageId);

        return new Response(
          JSON.stringify({ 
            status: 'ready', 
            success: true,
            coloringImageUrl: page.coloring_image_url 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate via OpenAI
      console.log('Generating coloring image via OpenAI');

      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) {
        throw new Error("OPENAI_API_KEY not set");
      }

      const book = page.books;
      const difficulty = book?.difficulty || "intermediate";
      const prompt = buildColoringPrompt(difficulty);

      console.log('Using difficulty:', difficulty);
      console.log('Prompt:', prompt);

      // Fetch original image
      const originalRes = await fetch(page.original_image_url);
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
      fd.append("response_format", "b64_json");

      console.log('Calling OpenAI Images API');

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
        
        await supabase
          .from('pages')
          .update({ status: 'failed' })
          .eq('id', pageId);

        return new Response(
          JSON.stringify({ status: 'failed', error: 'Coloring conversion failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const json = await aiRes.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No image returned from OpenAI");
      }

      console.log('OpenAI returned image, uploading to storage');

      const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const resultBlob = new Blob([binary], { type: "image/png" });

      // Upload to Supabase Storage
      const filename = `${pageId}-${difficulty}.png`;
      const storagePath = `books/${page.book_id}/pages/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("book-images")
        .upload(storagePath, resultBlob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("book-images")
        .getPublicUrl(storagePath);

      const coloringImageUrl = urlData.publicUrl;

      console.log('Coloring image uploaded to:', coloringImageUrl);

      // Update page record
      await supabase
        .from("pages")
        .update({
          coloring_image_url: coloringImageUrl,
          status: "ready",
        })
        .eq("id", pageId);

      return new Response(
        JSON.stringify({
          status: "ready",
          success: true,
          coloringImageUrl,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown status
    console.log('Unknown page status:', page.status);
    return new Response(
      JSON.stringify({ status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking status:', error);
    
    // Try to mark page as failed
    try {
      const body = await req.clone().json();
      if (body.pageId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabase
          .from('pages')
          .update({ status: 'failed' })
          .eq('id', body.pageId);
      }
    } catch (e) {
      console.error('Failed to mark page as failed:', e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

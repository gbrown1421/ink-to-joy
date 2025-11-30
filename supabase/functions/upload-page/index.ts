import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "Quick and Easy" | "Beginner" | "Intermediate";

/**
 * Normalize difficulty strings stored in the DB.
 */
function normalizeDifficulty(raw: string | null): Difficulty {
  const v = (raw || "").toLowerCase();
  if (v === "quick" || v === "quick and easy" || v === "quick & easy") {
    return "Quick and Easy";
  }
  if (v === "beginner") {
    return "Beginner";
  }
  return "Intermediate";
}

/**
 * Prompt builder – image-agnostic, only talks about difficulty + style.
 * We rely on the photo we send to OpenAI, not on hard-coded image content.
 */
function buildColoringPrompt(difficulty: Difficulty): string {
  if (difficulty === "Quick and Easy") {
    return `
Convert the uploaded photo into a very simple black-and-white line-art coloring page.

Rules:
- Keep the main subject(s) from the photo clearly recognizable.
- Use thick, bold outlines and big simple shapes.
- Remove busy background clutter; at most a couple of large, simple background shapes.
- Very few small details; suitable for young kids.
- No shading, gradients, hatching or gray tones – only solid black lines on white.
`.trim();
  }

  if (difficulty === "Beginner") {
    return `
Convert the uploaded photo into a black-and-white line-art coloring page for early elementary kids.

Rules:
- Keep the main subject(s) recognizable and roughly the same pose as in the photo.
- Medium-thick, clean outlines.
- Moderate detail in clothing, hair and important features.
- Simple background with a few large and medium-sized elements; avoid tiny clutter.
- No shading, gradients, hatching or gray tones – only black outlines on white.
`.trim();
  }

  // Intermediate
  return `
Convert the uploaded photo into a more detailed black-and-white line-art coloring page.

Rules:
- Keep the main subject(s) recognizable and clearly based on the photo.
- Finer, controlled outlines while still clear and easy to color.
- More folds, textures and elements to color than Beginner.
- Fuller background scene, but still readable and not chaotic.
- No shading, gradients, hatching or gray tones – only solid black outlines on white.
`.trim();
}

/**
 * OpenAI /images/edits is picky: it wants PNG with an alpha channel (RGBA).
 * This helper converts whatever the user uploaded into a clean RGBA PNG File.
 */
async function normalizeForOpenAI(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const img = await Image.decode(bytes); // auto-detects format
  const pngBytes = await img.encode(); // encodes as PNG (RGBA)
  return new File([pngBytes], "source.png", { type: "image/png" });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase URL or SERVICE_ROLE_KEY not set");
    return new Response(JSON.stringify({ error: "Supabase server config missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!openaiKey) {
    console.error("OPENAI_API_KEY is not set");
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const formData = await req.formData();
    const bookId = formData.get("bookId") as string | null;
    const imageFile = formData.get("image") as File | null;

    if (!bookId || !imageFile) {
      return new Response(JSON.stringify({ error: "bookId and image are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("InkToJoy upload-page: bookId", bookId, "file", imageFile.name);

    // Only allow formats OpenAI will accept as a source.
    const supported = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    const imageType = (imageFile.type || "").toLowerCase();
    if (!supported.includes(imageType)) {
      const msg = `Unsupported image format: ${imageType}. Please upload PNG, JPEG, WEBP or GIF.`;
      console.error(msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get book – we only support project_type === "coloring" here.
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, project_type, difficulty")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      console.error("Book fetch error:", bookError);
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (book.project_type !== "coloring") {
      const msg = "This edge function is locked to REALISTIC coloring projects only.";
      console.error(msg, { project_type: book.project_type });
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine next page order
    const { data: existingPages } = await supabase
      .from("pages")
      .select("page_order")
      .eq("book_id", bookId)
      .order("page_order", { ascending: false })
      .limit(1);

    const nextOrder = existingPages && existingPages.length > 0 ? (existingPages[0].page_order ?? 0) + 1 : 1;

    // Upload original photo as-is to Supabase storage
    const ext = imageFile.name.includes(".") ? imageFile.name.split(".").pop() : "jpg";
    const originalPath = `books/${bookId}/original/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("book-images").upload(originalPath, imageFile, {
      contentType: imageFile.type || "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      console.error("Original upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload original image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { publicUrl: originalUrl },
    } = supabase.storage.from("book-images").getPublicUrl(originalPath);

    console.log("Original stored at:", originalUrl);

    // Create page record (processing)
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .insert({
        book_id: bookId,
        original_image_url: originalUrl,
        page_order: nextOrder,
        status: "processing",
      })
      .select()
      .single();

    if (pageError || !page) {
      console.error("Page insert error:", pageError);
      return new Response(JSON.stringify({ error: "Failed to create page record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==== OPENAI CALL – REALISTIC LINE ART BASED ON PHOTO ====
    try {
      const difficulty = normalizeDifficulty(book.difficulty as string | null);
      const prompt = buildColoringPrompt(difficulty);
      console.log("OpenAI realistic pipeline:", {
        bookId,
        pageId: page.id,
        difficulty,
      });

      // Re-encode to RGBA PNG for /images/edits
      const openAiImage = await normalizeForOpenAI(imageFile);

      const aiForm = new FormData();
      aiForm.append("model", "gpt-image-1");
      aiForm.append("prompt", prompt);
      aiForm.append("image", openAiImage);
      aiForm.append("size", "1024x1536");

      const aiRes = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: aiForm,
      });

      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        console.error("OpenAI API error:", {
          status: aiRes.status,
          error: errorText.slice(0, 500),
        });
        throw new Error(`OpenAI API error ${aiRes.status}`);
      }

      const aiJson = await aiRes.json();
      const b64 = aiJson?.data?.[0]?.b64_json;

      if (!b64) {
        console.error("No b64_json from OpenAI:", JSON.stringify(aiJson));
        throw new Error("No image data returned from OpenAI");
      }

      const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const resultBlob = new Blob([binary], { type: "image/png" });

      const difficultySuffix = difficulty.toLowerCase().replace(/\s+/g, "-");
      const resultPath = `books/${bookId}/pages/${page.id}-${difficultySuffix}.png`;

      const { error: resultUploadError } = await supabase.storage.from("book-images").upload(resultPath, resultBlob, {
        contentType: "image/png",
        upsert: true,
      });

      if (resultUploadError) {
        console.error("Result upload error:", resultUploadError);
        throw new Error("Failed to upload coloring image to storage");
      }

      const {
        data: { publicUrl: coloringImageUrl },
      } = supabase.storage.from("book-images").getPublicUrl(resultPath);

      console.log("SUCCESS_REALISTIC", {
        difficulty,
        pageId: page.id,
        coloringImageUrl,
      });

      await supabase
        .from("pages")
        .update({
          coloring_image_url: coloringImageUrl,
          status: "ready",
        })
        .eq("id", page.id);

      return new Response(
        JSON.stringify({
          pageId: page.id,
          status: "ready",
          coloringImageUrl,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (err) {
      console.error("Error during OpenAI processing:", err);

      await supabase.from("pages").update({ status: "failed" }).eq("id", page.id);

      const message = err instanceof Error ? err.message : "Unknown error during image processing";

      return new Response(
        JSON.stringify({
          pageId: page.id,
          status: "failed",
          error: message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (err) {
    console.error("upload-page top-level error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

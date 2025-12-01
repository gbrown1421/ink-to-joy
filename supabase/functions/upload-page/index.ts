import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "Quick and Easy" | "Beginner" | "Intermediate";

function normalizeDifficulty(raw: string | null): Difficulty {
  const v = (raw || "").toLowerCase();
  if (v === "quick" || v === "quick and easy" || v === "quick & easy") {
    return "Quick and Easy";
  }
  if (v === "beginner") return "Beginner";
  return "Intermediate";
}

function buildColoringPrompt(difficulty: Difficulty): string {
  const base = `
Turn the uploaded photo into a black-and-white line-art coloring page.
Use only solid black outlines on pure white — no shading, no gradients, no cross-hatching.
Keep the same people/subjects and overall pose from the photo.
`.trim();

  if (difficulty === "Quick and Easy") {
    return (
      base +
      `
Make this version very simple for young kids:
- Very thick bold outlines.
- Big simple shapes, minimal interior detail.
- Background should be mostly empty or have at most 1–2 large simple shapes.
`.trim()
    );
  }

  if (difficulty === "Beginner") {
    return (
      base +
      `
Make this version for early elementary kids:
- Medium-thick clean outlines.
- Moderate detail in clothing and hair.
- Simple, uncluttered background with a few large/medium elements.
- Avoid tiny clutter or dense patterns.
`.trim()
    );
  }

  // Intermediate
  return (
    base +
    `
Make this version more detailed:
- Finer, controlled outlines while still clear.
- More folds, textures, and elements to color.
- Fuller background scene that is still readable, not chaotic.
`.trim()
  );
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
    return new Response(
      JSON.stringify({ error: "Supabase server config missing" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!openaiKey) {
    console.error("OPENAI_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const formData = await req.formData();
    const bookId = formData.get("bookId") as string | null;
    const imageFile = formData.get("image") as File | null;

    if (!bookId || !imageFile) {
      return new Response(
        JSON.stringify({ error: "bookId and image are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("upload-page: bookId", bookId, "file", imageFile.name);

    // Basic type guard – OpenAI supports png, jpeg, gif, webp
    const supported = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ];
    const imageType = (imageFile.type || "").toLowerCase();
    if (!supported.includes(imageType)) {
      console.error("Unsupported image type:", imageType);
      return new Response(
        JSON.stringify({
          error:
            "Unsupported image format. Please upload PNG, JPEG, GIF, or WEBP.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Look up book: we only handle realistic coloring here
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, project_type, difficulty")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      console.error("Book fetch error:", bookError);
      return new Response(
        JSON.stringify({ error: "Book not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (book.project_type !== "coloring") {
      return new Response(
        JSON.stringify({
          error: "This edge function currently supports only realistic coloring books.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Determine next page order
    const { data: existingPages } = await supabase
      .from("pages")
      .select("page_order")
      .eq("book_id", bookId)
      .order("page_order", { ascending: false })
      .limit(1);

    const nextOrder =
      existingPages && existingPages.length > 0
        ? (existingPages[0].page_order ?? 0) + 1
        : 1;

    // Upload original to storage
    const ext = imageFile.name.includes(".")
      ? imageFile.name.split(".").pop()
      : "jpg";
    const originalPath = `books/${bookId}/original/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("book-images")
      .upload(originalPath, imageFile, {
        contentType: imageType || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Original upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload original image" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const {
      data: { publicUrl: originalUrl },
    } = supabase.storage.from("book-images").getPublicUrl(originalPath);

    console.log("Original stored at:", originalUrl);

    // Create page DB row
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
      return new Response(
        JSON.stringify({ error: "Failed to create page record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const difficulty = normalizeDifficulty(book.difficulty as string | null);
    const prompt = buildColoringPrompt(difficulty);

    console.log("Generating coloring page with gpt-image-1 for page", page.id);
    console.log("Using prompt length:", prompt.length);

    // Call OpenAI /v1/images/edits endpoint
    try {
      // IMPORTANT: fetch the stored image from Supabase and wrap it
      // as a clean PNG file before sending to OpenAI.
      const originalRes = await fetch(originalUrl);
      if (!originalRes.ok) {
        throw new Error(
          `Failed to fetch original image from storage: ${originalRes.status}`,
        );
      }

      const originalBlob = await originalRes.blob();
      const openAiFile = new File([originalBlob], "source.png", {
        type: "image/png",
      });

      const aiForm = new FormData();
      aiForm.append("model", "gpt-image-1");
      aiForm.append("prompt", prompt);
      aiForm.append("image", openAiFile);
      aiForm.append("size", "1024x1536");

      const generateResponse = await fetch(
        "https://api.openai.com/v1/images/edits",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: aiForm,
        },
      );

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("OpenAI API error:", {
          project_type: book.project_type,
          difficulty,
          status: generateResponse.status,
          error: errorText.substring(0, 500),
        });
        throw new Error(`OpenAI API error ${generateResponse.status}`);
      }

      const aiJson = await generateResponse.json();
      const url: string | undefined = aiJson?.data?.[0]?.url;

      if (!url) {
        console.error("No image URL from OpenAI:", JSON.stringify(aiJson));
        throw new Error("No image URL returned from OpenAI");
      }

      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to fetch generated image: ${imageResponse.status}`,
        );
      }

      const resultBlob = await imageResponse.blob();

      const difficultySuffix = difficulty.toLowerCase().replace(/\s+/g, "-");
      const resultPath =
        `books/${bookId}/pages/${page.id}-${difficultySuffix}.png`;

      const { error: resultUploadError } = await supabase.storage
        .from("book-images")
        .upload(resultPath, resultBlob, {
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

      console.log("SUCCESS_REALISTIC:", {
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

      await supabase
        .from("pages")
        .update({ status: "failed" })
        .eq("id", page.id);

      const message =
        err instanceof Error
          ? err.message
          : "Unknown error during image processing";

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

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

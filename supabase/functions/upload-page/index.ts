import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "Quick and Easy" | "Beginner" | "Intermediate";

function normalizeDifficulty(raw: string | null): Difficulty {
  const v = (raw || "").toLowerCase().trim();

  if (v === "quick" || v === "quick and easy" || v === "quick & easy") {
    return "Quick and Easy";
  }
  if (v === "beginner") {
    return "Beginner";
  }
  return "Intermediate";
}

function buildColoringPrompt(difficulty: Difficulty): string {
  switch (difficulty) {
    case "Quick and Easy":
      return `
Create a very simple black-and-white line-art coloring page based on the uploaded photo.

Style:
- Thick bold black outlines only.
- Big, simple shapes that are easy for young kids to color.
- Very few small details.

Background:
- Mostly empty OR only 1–2 large simple shapes.
- No dense clutter, no tiny objects.

Rules:
- Output must be pure black line art on a white background.
- No shading, gradients, grey tones, or cross-hatching.
`.trim();

    case "Beginner":
      return `
Create a black-and-white line-art coloring page based on the uploaded photo for early elementary kids.

Style:
- Medium-thick, clean black outlines.
- Moderate detail in clothing and hair.
- Lines should be clear and easy to color inside.

Background:
- Simple background with a few large and medium-sized elements.
- Avoid tiny clutter and dense patterns.

Rules:
- Output must be pure black line art on a white background.
- No shading, gradients, grey tones, or cross-hatching.
`.trim();

    case "Intermediate":
      return `
Create a detailed black-and-white line-art coloring page based on the uploaded photo.

Style:
- Finer, controlled black outlines, still clear for coloring.
- More folds, textures, and elements to color.
- Richer detail than Beginner, but not chaotic.

Background:
- Fuller background scene with more elements, still readable.

Rules:
- Output must be pure black line art on a white background.
- No shading, gradients, grey tones, or cross-hatching.
`.trim();
  }
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

    console.log("InkToJoy upload-page:", {
      bookId,
      fileName: imageFile.name,
      fileType: imageFile.type,
    });

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, project_type, difficulty, name")
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
        JSON.stringify({ error: "Only coloring projects are supported" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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

    const ext = imageFile.name.includes(".")
      ? imageFile.name.split(".").pop()
      : "png";
    const originalPath = `books/${bookId}/original/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("book-images")
      .upload(originalPath, imageFile, {
        contentType: imageFile.type || "image/png",
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

    console.log("Calling gpt-image-1 /images/edits", {
      pageId: page.id,
      difficulty,
    });

    try {
      const aiForm = new FormData();
      aiForm.append("model", "gpt-image-1");
      aiForm.append("prompt", prompt);
      aiForm.append("image", imageFile); // use original upload directly
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
        throw new Error("No b64_json returned from OpenAI");
      }

      const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const resultBlob = new Blob([binary], { type: "image/png" });

      const difficultySuffix = difficulty.toLowerCase().replace(/\s+/g, "-");
      const resultPath = `books/${bookId}/pages/${page.id}-${difficultySuffix}.png`;

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
        err instanceof Error ? err.message : "Unknown error during image processing";

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

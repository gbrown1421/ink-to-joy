import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "Quick and Easy" | "Beginner" | "Intermediate";

// Helper to normalize difficulty strings from the database
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

function buildColoringPrompt(difficulty: Difficulty): string {
  switch (difficulty) {
    case "Quick and Easy":
      return `Convert the uploaded photo into a very simple black-and-white line-art coloring page for young children.
– Keep the same main subject(s) and general composition from the photo, but simplify everything into big, easy-to-color shapes.
– Use thick bold outlines.
– Remove tiny textures and small background clutter.
– Background should be mostly empty or just one or two large simple shapes.
– Do not invent new characters, animals, or objects that are not in the photo.
– No shading, gradients, or cross-hatching: only solid black lines on a white page.`.trim();

    case "Beginner":
      return `Convert the uploaded photo into a black-and-white line-art coloring page for early elementary kids.
– Keep the same main subject(s) and pose from the photo so the picture is clearly recognizable.
– Use medium-thick, clean outlines.
– Include a simple, uncluttered background with just a few large and medium-sized elements from the real scene.
– Add moderate detail to clothing and hair, but avoid dense textures and tiny patterns.
– Do not replace people with animals or change the scene type; stay faithful to the original photo.
– No shading, gradients, or cross-hatching: only solid black lines on white.`.trim();

    case "Intermediate":
      return `Convert the uploaded photo into a more detailed black-and-white line-art coloring page.
– Preserve the same people/subjects, poses, and overall layout from the photo.
– Use finer, controlled outlines while keeping everything readable for coloring.
– Include a fuller background based on the real scene (furniture, decor, environment), but keep it clean and not chaotic.
– Add more folds, textures, and elements to color, but no scribbly noise.
– Do not invent a totally new scene or characters; the line art should clearly match the uploaded photo.
– No shading, gradients, or cross-hatching: only black outlines on white.`.trim();
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

    console.log("InkToJoy upload-page: bookId", bookId, "file", imageFile.name);

    // Validate image format - OpenAI only accepts png, jpeg, gif, webp
    const supportedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const imageType = imageFile.type.toLowerCase();
    
    if (!supportedFormats.includes(imageType)) {
      console.error("Unsupported image format:", imageType);
      return new Response(
        JSON.stringify({ 
          error: `Unsupported image format: ${imageType}. Please upload PNG, JPEG, GIF, or WEBP images only.` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get book to know difficulty / type
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
        JSON.stringify({ error: "Only coloring projects are supported by this function" }),
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

    const nextOrder = existingPages && existingPages.length > 0
      ? (existingPages[0].page_order ?? 0) + 1
      : 1;

    // Upload original photo to storage
    const ext = imageFile.name.includes(".")
      ? imageFile.name.split(".").pop()
      : "jpg";
    const originalPath = `books/${bookId}/original/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("book-images")
      .upload(originalPath, imageFile, {
        contentType: imageFile.type || "image/jpeg",
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
      return new Response(
        JSON.stringify({ error: "Failed to create page record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build realistic coloring prompt
    const difficulty = normalizeDifficulty(book.difficulty as string | null);
    const prompt = buildColoringPrompt(difficulty);

    console.log("Book details:", { id: book.id, project_type: book.project_type, difficulty: book.difficulty });
    console.log("Using coloring prompt, difficulty:", difficulty);

    console.log("Converting photo to coloring page with gpt-image-1 for page", page.id);
    console.log("Using prompt length:", prompt.length);

    // Call OpenAI /v1/images/edits endpoint with the uploaded photo
    try {
      const aiForm = new FormData();
      aiForm.append("model", "gpt-image-1");
      aiForm.append("prompt", prompt);
      aiForm.append("image", imageFile);
      aiForm.append("size", "1024x1536");

      const generateResponse = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: aiForm,
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("OpenAI API error:", {
          project_type: book.project_type,
          difficulty,
          imageType: imageFile.type,
          status: generateResponse.status,
          error: errorText.substring(0, 500)
        });
        throw new Error(`OpenAI API error ${generateResponse.status}`);
      }

      const aiJson = await generateResponse.json();
      const b64 = aiJson?.data?.[0]?.b64_json;

      if (!b64) {
        console.error("No b64_json from OpenAI:", JSON.stringify(aiJson));
        throw new Error("No b64_json returned from OpenAI");
      }

      console.log("OpenAI generated b64_json, decoding...");

      // Decode base64 to binary and create PNG blob
      const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const resultBlob = new Blob([binary], { type: "image/png" });

      // Use difficulty for file naming
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
        coloringImageUrl
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

      const message = err instanceof Error
        ? err.message
        : "Unknown error during image processing";

      return new Response(
        JSON.stringify({ 
          pageId: page.id, 
          status: "failed",
          error: message 
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

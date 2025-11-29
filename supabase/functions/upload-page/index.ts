import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper to normalize any uploaded image to a clean RGBA PNG for OpenAI
async function normalizeToPng(file: File): Promise<File> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const img = await Image.decode(buf);
  const pngBytes = await img.encode(); // encode as PNG (default format)
  return new File([new Uint8Array(pngBytes)], "source.png", { type: "image/png" });
}

type Difficulty = "Quick and Easy" | "Beginner" | "Intermediate";
type ToonDifficulty = "quick_and_easy_toon" | "adv_beginner_toon";

// Helper to normalize difficulty strings from the database
function normalizeDifficulty(raw: string | null): Difficulty {
  const value = (raw || "Intermediate").trim().toLowerCase();
  if (value === "quick and easy" || value === "quick_easy" || value === "quick" || value === "quick & easy") {
    return "Quick and Easy";
  }
  if (value === "beginner") {
    return "Beginner";
  }
  return "Intermediate";
}

function mapToonDifficulty(raw: string | null): ToonDifficulty {
  const value = (raw || "").toLowerCase();
  if (value === "quick and easy" || value === "quick" || value === "quick & easy") {
    return "quick_and_easy_toon";
  }
  return "adv_beginner_toon";
}

const TOON_QUICK_AND_EASY_PROMPT = `
CARTOON / CARICATURE COLORING PAGE – QUICK AND EASY

GOAL:
- Turn the uploaded photo into a very simple cartoon-style black-and-white line-art coloring page.
- Only solid black outlines on pure white; no gray, no shading, no gradients, no cross-hatching.

STYLE:
- Chibi / caricature look.
- Heads clearly oversized: roughly half of the total body height (big head, small body).
- Big round eyes, tiny nose and mouth, very simple happy expressions.
- Short, simplified bodies and limbs; no realistic anatomy or muscles.
- Very few clothing folds; large, simple shapes.

LINE WORK & COMPLEXITY:
- Use VERY THICK bold outlines for the main characters.
- Minimal interior detail; avoid small textures and micro-details.
- Keep everything extremely simple and easy to color for young kids.

BACKGROUND:
- Background must be almost empty.
- At most one or two large, simple background shapes (for example a single window, a simple rug, or one big star).
- No clutter, no tiny objects, no detailed furniture or busy patterns.
`.trim();

const TOON_ADV_BEGINNER_PROMPT = `
CARTOON / CARICATURE COLORING PAGE – ADVANCED BEGINNER

GOAL:
- Turn the uploaded photo into a cartoon-style black-and-white line-art coloring page.
- Only solid black outlines on pure white; no gray, no shading, no gradients, no cross-hatching.

STYLE:
- Clean cartoon / caricature look.
- Heads still noticeably oversized (about one third to half of body height), clearly not realistic proportions.
- Big expressive eyes, simplified nose and mouth, friendly smiles.
- Bodies more detailed than Quick and Easy but still obviously cartoonish.

LINE WORK & COMPLEXITY:
- Medium-thick, clean outlines.
- More interior detail than Quick and Easy: some clothing folds, simple hair strands, a few textures.
- Avoid tiny fussy textures or dense line noise; keep shapes readable and easy to color.

BACKGROUND:
- Simple cartoon scene with a few medium-sized background elements.
- The scene should feel like a place (for example a room or outdoor area) but must not be cluttered.
- Use a handful of bold, simple shapes instead of many tiny objects.
`.trim();

function buildToonPrompt(difficulty: ToonDifficulty): string {
  switch (difficulty) {
    case "quick_and_easy_toon":
      return TOON_QUICK_AND_EASY_PROMPT;
    case "adv_beginner_toon":
      return TOON_ADV_BEGINNER_PROMPT;
    default:
      return TOON_ADV_BEGINNER_PROMPT;
  }
}

function buildColoringPrompt(difficulty: Difficulty): string {
  switch (difficulty) {
    case "Quick and Easy":
      return `
Create a very simple black-and-white line-art coloring page.
- Thick bold outlines.
- Big simple shapes that are easy for young kids to color.
- Very few small details.
- Background should be mostly empty or just a couple of large, simple shapes.
- No shading, gradients, or cross-hatching – only solid black lines on white.
`.trim();

    case "Beginner":
      return `
Create a black-and-white line-art coloring page for early elementary kids.
- Medium-thick clean outlines.
- Moderate detail in clothing and hair.
- Simple background with a few large and medium-sized elements.
- Avoid tiny clutter and dense patterns.
- No shading, gradients, or cross-hatching – only solid black lines on white.
`.trim();

    case "Intermediate":
      return `
Create a black-and-white line-art coloring page with richer detail.
- Finer, controlled outlines while still remaining clear.
- More folds, textures, and elements to color.
- Fuller background scene, but still readable and not chaotic.
- No shading, gradients, or cross-hatching – only solid black lines on white.
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

    if (book.project_type !== "coloring" && book.project_type !== "toon") {
      return new Response(
        JSON.stringify({ error: "Only coloring and toon projects are supported" }),
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

    // Build style prompt based on project type and difficulty
    let prompt: string;

    console.log("Book details:", { id: book.id, project_type: book.project_type, difficulty: book.difficulty });

    if (book.project_type === "toon") {
      const toonDifficulty = mapToonDifficulty(book.difficulty as string | null);
      prompt = buildToonPrompt(toonDifficulty);
      console.log("Using toon prompt, difficulty:", toonDifficulty);
    } else {
      const difficulty = normalizeDifficulty(book.difficulty as string | null);
      prompt = buildColoringPrompt(difficulty);
      console.log("Using coloring prompt, difficulty:", difficulty);
    }
    
    const normalizedDifficulty = book.project_type === "toon" 
      ? (mapToonDifficulty(book.difficulty as string | null) === "quick_and_easy_toon" ? "Quick and Easy" : "Beginner")
      : normalizeDifficulty(book.difficulty as string | null);

    console.log("Generating coloring page with gpt-image-1 for page", page.id);
    console.log("Using prompt length:", prompt.length);

    // Call OpenAI /v1/images/edits endpoint
    try {
      // Normalize the image to a clean RGBA PNG for OpenAI
      const openAiImageFile = await normalizeToPng(imageFile);
      
      const aiForm = new FormData();
      aiForm.append("model", "gpt-image-1");
      aiForm.append("prompt", prompt);
      aiForm.append("image", openAiImageFile);
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
        console.error("OpenAI API error:", generateResponse.status, errorText);
        throw new Error(`OpenAI API error ${generateResponse.status}: ${errorText}`);
      }

      const generateJson = await generateResponse.json();
      const imageUrl = generateJson.data?.[0]?.url;

      if (!imageUrl) {
        console.error("No image URL from OpenAI:", JSON.stringify(generateJson));
        throw new Error("No image URL returned from OpenAI");
      }

      console.log("OpenAI generated image URL:", imageUrl);

      // Fetch the image from OpenAI's URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch generated image: ${imageResponse.status}`);
      }

      const resultBlob = await imageResponse.blob();

      // Use normalized difficulty for file naming
      const difficultySuffix = normalizedDifficulty.toLowerCase().replace(/\s+/g, "-");
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

      console.log("Coloring image stored at:", coloringImageUrl);

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
          error: message 
        }),
        {
          status: 500,
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "Quick and Easy" | "Beginner" | "Intermediate";
type ToonDifficulty = "quick_and_easy_toon" | "adv_beginner_toon";

const TOON_QUICK_AND_EASY_PROMPT = `
Black-and-white line-art coloring page in a very simple chibi / caricature cartoon style.

STYLE & PROPORTIONS
- All subjects are redrawn as cute chibi characters.
- Heads are clearly oversized (around one-third to one-half of total body height).
- Big round eyes, tiny nose and mouth, simple happy expressions.
- Short, simplified bodies and limbs; no realistic anatomy or muscles.

LINES & DIFFICULTY – "Quick and Easy"
- Very thick, bold outlines for all main shapes.
- Minimal interior detail: large, simple shapes for hair, clothes and features.
- No tiny patterns, no thin fiddly lines, no micro-textures.
- Overall complexity should be suitable for very young children.

BACKGROUND
- Background is extremely simple or mostly blank.
- At most a couple of large, simple shapes (for example a star, a window, or a simple rug).
- No cluttered scenes, no wall of tiny objects or detailed furniture.

COLORING PAGE CONSTRAINTS
- Use pure black outlines on white only.
- No gray, no shading, no gradients, no cross-hatching.
- All outlines must form clean, closed shapes that are easy to color in.
`.trim();

const TOON_ADV_BEGINNER_PROMPT = `
Black-and-white line-art coloring page in a polished cartoon / caricature style.

STYLE & PROPORTIONS
- All subjects are redrawn as stylized cartoon characters.
- Heads remain noticeably larger than realistic, roughly one-third of body height.
- Big expressive eyes, simplified nose and mouth, friendly expressions.
- Bodies are simplified but a bit more detailed than the Quick and Easy version.

LINES & DIFFICULTY – "Advanced Beginner"
- Medium-thick outlines with clear, readable shapes.
- More interior detail than the Quick and Easy style: some clothing folds, simple hair strands, and a few clear textures.
- Avoid tiny fussy textures or dense line work; the page must still be easy to color.

BACKGROUND
- Simple cartoon environment with a few medium-sized background elements (such as shelves, a rug, or a couple of wall decorations).
- The scene should feel like a recognizable place without being cluttered.
- Prefer bold, clean shapes over many small objects.

COLORING PAGE CONSTRAINTS
- Use pure black outlines on white only.
- No gray, no shading, no gradients, no cross-hatching.
- All outlines should be clean and closed so that areas are easy to color.
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
Black-and-white line-art coloring page in a "Quick and Easy" style suitable for very young children.

LINES & DETAIL:
- VERY THICK, bold black outlines.
- Very few interior lines; large, simple shapes.
- No tiny textures, no small patterns, no micro-detail.

BACKGROUND:
- Background should be completely blank white.
- Do not draw scenery, furniture, patterns, or any other background elements.
- The page should look almost empty except for the main subjects outlined in simple bold lines.

GENERAL:
- No shading, hatching, cross-hatching, gradients, or gray tones of any kind.
- Only solid black outlines on white.
`.trim();

    case "Beginner":
      return `
Black-and-white line-art coloring page in a "Beginner" style.

LINES & DETAIL:
- MEDIUM-THICK, clean black outlines.
- Some interior detail: basic clothing folds, simple hair lines, a few accessories.
- Avoid tiny textures, dense patterns, or super-fine micro-detail.

BACKGROUND:
- Simple, uncluttered background.
- Only a small number of large, clear shapes (for example a couple of big pieces of furniture or decorations).
- Leave plenty of white space; the scene should feel open and easy to color.

GENERAL:
- No shading, hatching, cross-hatching, gradients, or gray tones.
- Only solid black outlines on a white page.
`.trim();

    case "Intermediate":
      return `
Black-and-white line-art coloring page in an "Intermediate" style.

LINES & DETAIL:
- Finer black outlines than Beginner, but still clean and easy to color.
- More interior detail: additional folds, hair strands, accessories, and shapes.
- Detail should be interesting but still readable – avoid messy scribbles.

BACKGROUND:
- A fuller scene with multiple background elements.
- More objects and structure than Beginner, but not so dense that it becomes visual noise.
- Maintain clear shapes with distinct areas to color.

GENERAL:
- No grayscale of any kind: no shading, hatching, cross-hatching, or gradients.
- Only solid black line work on a white page.
`.trim();

    default: {
      const never: never = difficulty;
      throw new Error(`Unsupported difficulty: ${never}`);
    }
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
      const rawDifficulty = (book.difficulty || "Quick and Easy") as string;
      const toonDifficulty: ToonDifficulty =
        rawDifficulty === "Quick and Easy"
          ? "quick_and_easy_toon"
          : "adv_beginner_toon";

      prompt = buildToonPrompt(toonDifficulty);
      console.log("Using toon prompt, difficulty:", toonDifficulty);
    } else {
      // Coloring project
      const difficulty = book.difficulty as string;

      if (!difficulty || !["Quick and Easy", "Beginner", "Intermediate"].includes(difficulty)) {
        console.error("Invalid difficulty for coloring project:", book.difficulty);
        
        await supabase
          .from("pages")
          .update({ status: "failed" })
          .eq("id", page.id);

        return new Response(
          JSON.stringify({ 
            pageId: page.id, 
            error: `Invalid book difficulty: "${book.difficulty}". Expected "Quick and Easy", "Beginner", or "Intermediate"` 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      prompt = buildColoringPrompt(difficulty as Difficulty);
      console.log("Using coloring prompt, difficulty:", difficulty);
    }

    console.log("Generating coloring page with gpt-image-1 for page", page.id);
    console.log("Using prompt length:", prompt.length);

    // Call OpenAI /v1/images/edits endpoint
    try {
      const openaiFormData = new FormData();
      openaiFormData.append("image", imageFile);
      openaiFormData.append("prompt", prompt);
      openaiFormData.append("model", "gpt-image-1");
      openaiFormData.append("n", "1");
      openaiFormData.append("size", "1024x1536");
      // Note: response_format is NOT supported by /v1/images/edits - it always returns URLs

      const generateResponse = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: openaiFormData,
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

      const difficultySuffix = (book.difficulty || "intermediate")
        .toLowerCase()
        .replace(/\s+/g, "-");
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
        JSON.stringify({ pageId: page.id, error: message }),
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

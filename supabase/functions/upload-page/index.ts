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
CARTOON / CARICATURE COLORING PAGE – QUICK AND EASY (ages 3–6)

GOAL
Create a very simple black-and-white coloring page where the main subject(s) are drawn as cute cartoon characters.

STYLE
- Strong cartoon / chibi / caricature look.
- Heads clearly oversized: roughly one-third to one-half of total body height.
- Big round eyes, small nose and mouth, friendly expression.
- Short, simplified bodies and limbs; no realistic anatomy or muscles.
- Simple hair shapes and clothing, drawn with large, smooth curves.

DIFFICULTY & LINE WORK
- Designed for very young children.
- Very thick bold outlines for all main shapes.
- Minimal interior detail: avoid textures, tiny folds, or micro-details.
- Only solid black outlines on pure white; absolutely no grey, shading, gradients, or hatching.

BACKGROUND
- Background must be almost empty.
- At most one or two large, simple shapes to suggest a setting (for example a single big window, a star, a rug shape, or a very simple piece of furniture).
- No clutter, no crowd of small objects, no complex patterns.
- Leave plenty of big open white areas that are easy to color.
`;

const TOON_ADV_BEGINNER_PROMPT = `
CARTOON / CARICATURE COLORING PAGE – ADVANCED BEGINNER

GOAL
Create a black-and-white coloring page where the main subject(s) are drawn as polished cartoon characters with a simple but recognizable scene.

STYLE
- Clear cartoon / caricature look.
- Heads noticeably oversized compared to the body (larger than realistic proportions).
- Big expressive eyes, simplified nose and mouth, friendly smiles.
- Bodies more detailed than the Quick and Easy version, but still stylized and simplified.
- Simple but expressive hair and clothing shapes.

DIFFICULTY & LINE WORK
- Medium difficulty for kids who can handle a bit more detail.
- Medium-thick clean outlines for main shapes.
- Some interior detail is allowed (a few clothing folds, simple hair strands, large patterns), but avoid tiny or fussy line work.
- Only solid black outlines on pure white; absolutely no grey, shading, gradients, or hatching.

BACKGROUND
- Simple cartoon scene with a few medium-sized background elements to show a location (for example some furniture, a rug, a window, a couple of wall decorations, or a few large toys).
- The environment should feel present but not crowded.
- Avoid walls full of tiny objects or ultra-busy patterns; prefer bold, easy-to-color shapes.
- Keep the overall image readable and fun to color without overwhelming the page.
`;

function buildToonPrompt(difficulty: ToonDifficulty): string {
  switch (difficulty) {
    case "quick_and_easy_toon":
      return TOON_QUICK_AND_EASY_PROMPT.trim();
    case "adv_beginner_toon":
      return TOON_ADV_BEGINNER_PROMPT.trim();
    default:
      return TOON_ADV_BEGINNER_PROMPT.trim();
  }
}

/**
 * Build the exact prompt we send to gpt-image-1 for regular coloring pages.
 * Only three allowed values:
 *   - "Quick and Easy"
 *   - "Beginner"
 *   - "Intermediate"
 */
function buildColoringPrompt(difficulty: Difficulty): string {
  switch (difficulty) {
    case "Quick and Easy":
      return `
Create a black-and-white line-art coloring page in a "Quick and Easy" style suitable for very young children.

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
Create a black-and-white line-art coloring page in a "Beginner" style.

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
Create a black-and-white line-art coloring page in an "Intermediate" style.

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
      // Should never happen if we keep the DB/UI clean.
      // Throw so we see it immediately instead of silently generating the wrong thing.
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

    // --- CALL OPENAI SYNCHRONOUSLY (no background nonsense) ---
    try {
      let prompt: string;

      if (book.project_type === "toon") {
        // Cartoon mode: map difficulty to toon difficulty
        const rawDifficulty = (book.difficulty || "Quick and Easy") as string;
        const toonDifficulty: ToonDifficulty =
          rawDifficulty === "Quick and Easy"
            ? "quick_and_easy_toon"
            : "adv_beginner_toon";

        prompt = buildToonPrompt(toonDifficulty);

        console.log("InkToJoy toon prompt difficulty:", toonDifficulty);
        console.log("InkToJoy toon prompt (first 200 chars):", prompt.slice(0, 200));
      } else {
        // Regular coloring mode
        const difficulty = book.difficulty as Difficulty;

        if (!difficulty || !["Quick and Easy", "Beginner", "Intermediate"].includes(difficulty)) {
          throw new Error(`Invalid book difficulty: "${book.difficulty}"`);
        }

        prompt = buildColoringPrompt(difficulty);
      }

      console.log("Calling OpenAI gpt-image-1 for page", page.id, {
        projectType: book.project_type,
        difficulty: book.difficulty,
      });

      // Convert image to base64 in chunks to avoid stack overflow
      const imageBytes = await imageFile.arrayBuffer();
      const uint8Array = new Uint8Array(imageBytes);
      
      // Process in chunks to avoid stack overflow
      let binaryString = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Image = btoa(binaryString);
      const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;

      // Use chat completions with image generation tool (more reliable than /images/edits)
      const chatPayload = {
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Transform this image into a coloring page following these instructions:\n\n${prompt}`
              },
              {
                type: "input_image",
                image_url: imageDataUrl
              }
            ]
          }
        ],
        tools: [{ type: "image_generation" }],
        tool_choice: { type: "tool", tool: { type: "image_generation" } }
      };

      console.log("Sending image to OpenAI for transformation");

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(chatPayload),
      });

      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        console.error(
          "OpenAI API error:",
          aiRes.status,
          errorText.slice(0, 500),
        );
        throw new Error(`OpenAI API error ${aiRes.status}: ${errorText}`);
      }

      const aiJson = await aiRes.json();
      
      // Extract image from tool call response
      const toolCall = aiJson?.output?.find((o: any) => o.type === "image_generation_call");
      const b64 = toolCall?.result;

      if (!b64) {
        console.error("OpenAI response missing image data:", JSON.stringify(aiJson).slice(0, 500));
        throw new Error("No image data returned from OpenAI");
      }

      const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const resultBlob = new Blob([binary], { type: "image/png" });

      const difficultySuffix = (book.difficulty || "intermediate")
        .toLowerCase()
        .replace(/\s+/g, "-");
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

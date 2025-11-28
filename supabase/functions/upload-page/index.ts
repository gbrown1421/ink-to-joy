import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "Quick and Easy" | "Beginner" | "Intermediate";
type ToonDifficulty = "quick-and-easy" | "advanced-beginner";

/**
 * Build cartoon coloring page prompt for toon projects.
 * Works with any photo, not hard-coded to specific subjects.
 */
function buildCartoonPrompt(difficulty: ToonDifficulty): string {
  const base = `
Turn the uploaded photo into a BLACK-AND-WHITE CARTOON STYLE COLORING PAGE.

- Redraw the subjects from the photo as cute 2D cartoon characters.
- Keep the same number of people/animals and the same basic pose and layout.
- Use big heads, large expressive eyes, simplified noses and mouths, rounded hands and feet.
- No realistic rendering: NO grayscale, NO shading, NO gradients, NO pencil texture.
- Only clean black outlines on a pure white page.
- Portrait orientation similar to an 8.5x11" coloring book page.
- Do not crop off heads or feet: keep each main subject fully in frame, head-to-toe when visible in the photo.
`;

  const quick = `
CARTOON – QUICK AND EASY (for ages ~3–6).

Style rules:
- Characters are very simple, cute, and chunky.
- Extra-large heads and eyes, very simple hair shapes.
- Clothing: big smooth areas, almost no folds or tiny details.
- Background: EXTREMELY SIMPLE.
  - Either completely blank white with a single floor line,
    OR at most 1–2 big shapes (e.g. a simple window or star) with NO small items.
- Use THICK, BOLD outlines and big open white spaces to color.
- Limit total color regions: aim for about 10–20 large regions.
- Absolutely NO hatching, texture, or tiny patterns.

If you start to add small objects, cluttered toys, text, or complex patterns: STOP and erase them. Keep it ultra-simple for toddlers.
`;

  const advancedBeginner = `
CARTOON – ADVANCED BEGINNER (a step between Beginner and Intermediate).

Style rules:
- Same cute cartoon style: larger heads and eyes, rounded features.
- Slightly more detail than Quick and Easy, but still clearly a kids' coloring page.
- Clothing: a few folds or simple patterns are OK, but avoid tiny textures.
- Background: SIMPLE but recognizable environment.
  - 3–5 big shapes only (e.g. one bookshelf, one window, a rug, a couple of wall decorations).
  - No busy clutter; group small items into large simplified shapes.
- Line weight: medium-thick, still bold and clean.
- No grayscale, shading, or cross-hatching – only outlines.

The result should look like a classic cartoon coloring-book page, not a realistic photo trace.
`;

  if (difficulty === "quick-and-easy") {
    return `${base}\n\n${quick}`;
  } else {
    return `${base}\n\n${advancedBeginner}`;
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
      // TODDLER / QUICK VERSION – NO BACKGROUND
      return `
Convert the uploaded photo into a super-simple "Quick and Easy" coloring page for young children.

Rules:
- Keep ONLY the main people from the photo as full-body characters, head to toes, facing the viewer.
- REMOVE the entire background (walls, windows, rugs, furniture, toys, posters, stars, etc.).
- Replace the background with PURE WHITE.
- You may draw ONE straight horizontal floor line under their feet. No other background lines or objects.
- Use VERY THICK, BOLD black outlines.
- Keep interior detail to a minimum: big simple shapes for clothes, hair, and faces.
- Faces should be very simple and friendly: basic eyes, small nose, small smile — no fine wrinkles or textures.
- Absolutely NO shading, hatching, cross-hatching, gradients, or gray tones. Only solid black lines on white.
- Layout should fit nicely on a vertical 8.5x11 page and must NOT crop off any heads or feet.
`.trim();

    case "Beginner":
      // BEGINNER – SMALL, SIMPLE BACKGROUND
      return `
Convert the uploaded photo into a "Beginner" coloring page.

Rules:
- Keep the same main people as in the photo, ideally full body if possible, clearly separated from the background.
- Draw a SIMPLE, UNCLUTTERED background:
  - At most 2–3 LARGE, simple elements (e.g. a big window, one toy shelf, a simple rug, a large star or picture frame).
  - Do NOT draw lots of small objects, scattered toys, detailed patterns, or visual clutter.
- Use MEDIUM-THICK, clean black outlines.
- Add some interior detail (hair strands, clothing folds, a few simple objects) but avoid tiny micro-details.
- Absolutely NO shading, hatching, cross-hatching, gradients, or gray tones. Only black line art on white.
- Keep everything clear and easy to color for kids in the Beginner range.
- Vertical 8.5x11 layout, do not crop off heads or feet if you can avoid it.
`.trim();

    case "Intermediate":
      // INTERMEDIATE – FULLER CLASSROOM BACKGROUND
      return `
Convert the uploaded photo into an "Intermediate" coloring page.

Rules:
- Keep the same main people from the photo, full body if possible.
- Include a recognizable background based on the real scene (furniture, shelves, windows, wall decorations, etc.),
  but draw everything as clean line art with no grayscale.
- You may include more objects and detail than in the Beginner version, but avoid noisy scribbles or unreadable clutter.
- Use FINER line work than Beginner but still clear black outlines suitable for kids to color.
- Absolutely NO shading, hatching, cross-hatching, gradients, or gray tones. Only black outlines on white.
- Layout should fit a vertical 8.5x11 page without cutting off heads or feet.
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
            ? "quick-and-easy"
            : "advanced-beginner";

        prompt = buildCartoonPrompt(toonDifficulty);

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

      const aiForm = new FormData();
      aiForm.append("model", "gpt-image-1");
      aiForm.append("prompt", prompt);
      // reuse the same uploaded File object
      aiForm.append("image", imageFile);
      aiForm.append("size", "1024x1536"); // portrait

      const aiRes = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: aiForm,
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
      const b64 = aiJson?.data?.[0]?.b64_json;

      if (!b64) {
        console.error("OpenAI response missing b64_json:", aiJson);
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

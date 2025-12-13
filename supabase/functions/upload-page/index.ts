import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "easy" | "medium" | "hard";

const MAX_DIMENSION = 2048;

/**
 * Decode any image via ImageScript, downscale if needed, re-encode as clean PNG.
 * This ensures compatibility with OpenAI's image API.
 */
async function sanitizeForOpenAI(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Decode image (supports PNG, JPEG, GIF, etc.)
  const img = await Image.decode(uint8);

  let width = img.width;
  let height = img.height;

  // Downscale if either dimension exceeds MAX_DIMENSION
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);
    img.resize(newWidth, newHeight);
    console.log(`Resized image from ${width}x${height} to ${newWidth}x${newHeight}`);
  }

  // Re-encode as PNG
  const pngData = await img.encode();
  // Create a copy to ensure proper ArrayBuffer type for Blob
  const pngBytes = new Uint8Array(pngData);
  const blob = new Blob([pngBytes], { type: "image/png" });

  return new File([blob], "sanitized.png", { type: "image/png" });
}

function normalizeDifficulty(raw: string | null): Difficulty {
  const v = (raw || "").toLowerCase().trim();

  if (v === "quick" || v === "quick and easy" || v === "quick & easy") {
    return "easy";
  }
  if (v === "beginner") {
    return "medium";
  }
  // Intermediate or anything else maps to hard
  return "hard";
}

/**
 * Prepare a safe, square PNG for OpenAI's /images/edits API.
 * - Decodes the uploaded file
 * - Scales it to fit inside a 1024x1024 box (keeps aspect ratio)
 * - Centers it on a white 1024x1024 canvas
 * - Returns a new PNG File
 */
async function prepareOpenAIImage(original: File): Promise<File> {
  const buf = new Uint8Array(await original.arrayBuffer());
  const img = await Image.decode(buf); // throws if image is corrupt

  const target = 1024;
  const { width, height } = img;

  // Scale down to fit inside target while keeping aspect ratio
  const scale = Math.min(target / width, target / height, 1);
  const newW = Math.max(1, Math.round(width * scale));
  const newH = Math.max(1, Math.round(height * scale));

  const resized = scale < 1 ? img.resize(newW, newH) : img; // don't upscale small images

  // White square canvas
  const canvas = new Image(target, target);
  canvas.fill(0xffffffff); // solid white background

  const offsetX = Math.floor((target - newW) / 2);
  const offsetY = Math.floor((target - newH) / 2);
  canvas.composite(resized, offsetX, offsetY);

  const pngData = await canvas.encode();
  const pngBytes = new Uint8Array(pngData);
  const blob = new Blob([pngBytes], { type: "image/png" });
  return new File([blob], "openai-base.png", { type: "image/png" });
}

function buildColoringPrompt(difficulty: Difficulty): string {
  const base =
    "Convert this photo into clean black-and-white coloring-book line art. " +
    "Keep all people, clothing, and objects recognizable and in the same pose. " +
    "Remove shading and gradients and use simple outlines only. " +
    "Do not change the body, clothing, or background content; only simplify into line art.";

  if (difficulty === "easy") {
    return (
      base +
      " Make it very simple with bold lines, large areas to color, minimal small details, and a simplified background."
    );
  }

  if (difficulty === "medium") {
    return (
      base +
      " Use medium detail with clear outlines, some background elements, and shapes that are easy but still interesting to color."
    );
  }

  // hard
  return (
    base +
    " Use high detail with fine lines, more background elements, and lots of smaller areas to color while still keeping everything clear."
  );
}

/**
 * Parse OpenAI error response and extract meaningful error info
 */
function parseOpenAIError(errorText: string): { code: string; message: string } {
  try {
    const parsed = JSON.parse(errorText);
    return {
      code: parsed?.error?.code ?? "unknown_error",
      message: parsed?.error?.message ?? "Unknown OpenAI error",
    };
  } catch {
    return {
      code: "parse_error",
      message: errorText.slice(0, 500),
    };
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

  // Debug: log first 8 chars of API key to verify which key is in use
  const keyPrefix = openaiKey.slice(0, 8);
  console.log(`[DEBUG] Using OpenAI API key prefix: ${keyPrefix}...`);

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

    // Sanitize the image: decode, resize if needed, re-encode as clean PNG
    let sanitizedFile: File;
    try {
      sanitizedFile = await sanitizeForOpenAI(imageFile);
      console.log("Image sanitized successfully:", {
        originalName: imageFile.name,
        originalSize: imageFile.size,
        sanitizedSize: sanitizedFile.size,
      });
    } catch (sanitizeErr) {
      console.error("Image sanitization failed:", sanitizeErr);
      return new Response(
        JSON.stringify({ error: "The source image could not be decoded." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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

    // Use sanitized PNG for storage
    const originalPath = `books/${bookId}/original/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("book-images")
      .upload(originalPath, sanitizedFile, {
        contentType: "image/png",
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

    console.log("Realistic coloring request:", {
      bookId,
      pageId: page.id,
      difficulty,
      originalType: imageFile.type,
    });

    try {
      // Sanitize the uploaded file for OpenAI - use square canvas approach
      let openAiImageFile: File = sanitizedFile;
      try {
        openAiImageFile = await prepareOpenAIImage(imageFile);
        console.log("prepareOpenAIImage succeeded:", {
          originalSize: imageFile.size,
          preparedSize: openAiImageFile.size,
        });
      } catch (prepErr) {
        console.error("prepareOpenAIImage failed, falling back to sanitized image:", prepErr);
      }

      const aiForm = new FormData();
      aiForm.append("model", "gpt-image-1");
      aiForm.append("prompt", prompt);
      aiForm.append("image", openAiImageFile);
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
        const { code, message } = parseOpenAIError(errorText);
        
        console.error("OpenAI API error details:", {
          status: aiRes.status,
          code,
          message,
          rawError: errorText.slice(0, 1000),
        });

        // Build a human-readable error message
        const errorMessage = `OpenAI ${aiRes.status}: ${code} – ${message}`;

        // Update page with failed status AND the error message
        await supabase
          .from("pages")
          .update({ 
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", page.id);

        return new Response(
          JSON.stringify({
            pageId: page.id,
            status: "failed",
            error: errorMessage,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const aiJson = await aiRes.json();
      const b64 = aiJson?.data?.[0]?.b64_json;

      if (!b64) {
        const errorMessage = "No b64_json returned from OpenAI";
        console.error(errorMessage, JSON.stringify(aiJson));
        
        await supabase
          .from("pages")
          .update({ 
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", page.id);

        return new Response(
          JSON.stringify({
            pageId: page.id,
            status: "failed",
            error: errorMessage,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
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
        const errorMessage = "Failed to upload coloring image to storage";
        console.error("Result upload error:", resultUploadError);
        
        await supabase
          .from("pages")
          .update({ 
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", page.id);

        return new Response(
          JSON.stringify({
            pageId: page.id,
            status: "failed",
            error: errorMessage,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
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
          error_message: null, // Clear any previous error
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
      const errorMessage = err instanceof Error ? err.message : "Unknown error during image processing";
      console.error("Error during OpenAI processing:", err);

      await supabase
        .from("pages")
        .update({ 
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", page.id);

      return new Response(
        JSON.stringify({
          pageId: page.id,
          status: "failed",
          error: errorMessage,
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

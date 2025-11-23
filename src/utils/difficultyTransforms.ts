/**
 * Client-side difficulty transforms using Canvas API
 * Generates simplified variants from Mimi's master line art
 */

type DifficultyVariant = "easy" | "beginner" | "intermediate";

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Beginner variant: Slightly simpler, bolder lines
 * Target: 3-4 year olds who can handle some detail
 */
export async function generateBeginnerFromMaster(masterUrl: string): Promise<Blob> {
  const img = await loadImage(masterUrl);

  const scale = 0.8; // slightly smaller to merge tiny details
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  
  // Light blur to fuse hair/background noise
  ctx.filter = "blur(0.7px)";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  // Hard threshold to pure black/white, but keep more detail than Easy
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = (r + g + b) / 3;
    const v = gray > 235 ? 255 : 0; // mostly white, clean dark lines
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png"
    )
  );
}

/**
 * Quick & Easy variant: Bold shapes, minimal detail
 * Target: Toddlers who need very simple outlines
 */
export async function generateEasyFromMaster(masterUrl: string): Promise<Blob> {
  const img = await loadImage(masterUrl);

  const scale = 0.55; // more aggressive downscale for toddlers
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;

  ctx.filter = "blur(1.4px)";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = (r + g + b) / 3;
    // more aggressive threshold: kill most fine detail, keep big shapes
    const v = gray > 245 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png"
    )
  );
}

/**
 * Upload a difficulty variant to Supabase storage
 */
export async function uploadDifficultyVariant(
  bookId: string,
  pageId: string,
  difficulty: DifficultyVariant,
  blob: Blob
): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  
  const filename = `${pageId}-${difficulty}.png`;
  const path = `books/${bookId}/pages/${filename}`;

  const { data, error } = await supabase.storage
    .from("book-images")
    .upload(path, blob, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("book-images")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

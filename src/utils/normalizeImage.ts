/**
 * Normalize an uploaded image to PNG format using createImageBitmap.
 * This ensures all images are in a consistent format for processing.
 * 
 * @param file - The original image file
 * @param maxSide - Maximum dimension (width or height) to downscale to
 * @returns A new File object containing the normalized PNG
 */
export async function normalizeToPng(
  file: File,
  maxSide = 2048
): Promise<File> {
  // Try to decode via browser; if this fails, the file is garbage for our purposes
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;

  // Optional: downscale very large images to avoid OpenAI size issues
  if (width > maxSide || height > maxSide) {
    const scale = Math.min(maxSide / width, maxSide / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error("Failed to convert to PNG"));
      resolve(b);
    }, "image/png");
  });

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", {
    type: "image/png",
  });
}

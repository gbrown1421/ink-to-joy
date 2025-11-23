/**
 * Client-side Quick & Easy generator using Canvas API
 * Converts Mimi's master line art into simplified toddler-friendly coloring pages
 */

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
 * Generate Quick & Easy variant from master Mimi image
 * - Fewer lines
 * - No small face details
 * - No interior texture lines
 * - Heavy, bold outer shapes only
 * - Pure black on white, no gray
 */
export async function generateQuickEasyFromMaster(masterUrl: string): Promise<Blob> {
  const img = await loadImage(masterUrl);

  // Step 1: Downscale aggressively to lose fine details
  const scale = 0.45; // Crush small details
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;

  // Draw downscaled image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Step 2: Blur to merge remaining noise
  ctx.filter = "blur(1.5px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";

  // Step 3: Scale back up to original size
  const outCanvas = document.createElement("canvas");
  outCanvas.width = img.width;
  outCanvas.height = img.height;
  const octx = outCanvas.getContext("2d")!;
  octx.imageSmoothingEnabled = false; // Keep crisp edges
  octx.drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height);

  // Step 4: Hard threshold to black/white (no gray shading)
  const imageData = octx.getImageData(0, 0, outCanvas.width, outCanvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i]; // r channel (grayscale)
    // Push most light pixels to white, keep only strong dark lines
    const value = v > 210 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  octx.putImageData(imageData, 0, 0);

  return await new Promise<Blob>((resolve, reject) =>
    outCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png"
    )
  );
}

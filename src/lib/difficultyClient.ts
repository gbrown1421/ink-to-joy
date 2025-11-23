/**
 * Client-side difficulty variant generator using Canvas API
 * Generates 3 versions from a single Mimi Panda master image:
 * - Intermediate: unchanged Mimi output
 * - Beginner: light simplification (slight blur + contrast)
 * - Quick & Easy: heavy simplification for toddlers (more blur, contrast, threshold)
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
 * Generate all 3 difficulty variants from master Mimi image
 * Returns data URLs that can be uploaded to storage
 */
export async function generateDifficultyVariants(baseUrl: string): Promise<{
  easyDataUrl: string;
  beginnerDataUrl: string;
  intermediateDataUrl: string;
}> {
  const img = await loadImage(baseUrl);
  const w = img.width;
  const h = img.height;

  const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, ctx };
  };

  // INTERMEDIATE = unchanged Mimi master
  const { canvas: interCanvas } = makeCanvas();
  const intermediateDataUrl = interCanvas.toDataURL("image/png");

  // BEGINNER = light simplification
  const { canvas: beginnerCanvas, ctx: beginnerCtx } = makeCanvas();
  beginnerCtx.filter = "blur(0.8px) contrast(1.1)";
  beginnerCtx.drawImage(beginnerCanvas, 0, 0);
  beginnerCtx.filter = "none";
  const beginnerDataUrl = beginnerCanvas.toDataURL("image/png");

  // QUICK & EASY = heavy simplification for toddlers
  const { canvas: easyCanvas, ctx: easyCtx } = makeCanvas();
  
  // Apply aggressive blur and contrast to merge small details
  easyCtx.filter = "blur(2px) contrast(1.4)";
  easyCtx.drawImage(easyCanvas, 0, 0);
  easyCtx.filter = "none";

  // Threshold to pure black/white (no gray) - kills tiny details
  const imgData = easyCtx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i]; // grayscale already
    const out = v > 220 ? 255 : 0; // aggressive threshold
    data[i] = data[i + 1] = data[i + 2] = out;
  }
  easyCtx.putImageData(imgData, 0, 0);
  const easyDataUrl = easyCanvas.toDataURL("image/png");

  return { easyDataUrl, beginnerDataUrl, intermediateDataUrl };
}

/**
 * Convert data URL to Blob for uploading
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Client-side Quick & Easy simplifier for toddler coloring pages
 * Takes a Mimi Panda line-art image and creates a much simpler version
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

export async function makeQuickEasyFromBase(baseUrl: string): Promise<string> {
  const img = await loadImage(baseUrl);
  const w = img.width;
  const h = img.height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Draw base Mimi line art
  ctx.drawImage(img, 0, 0, w, h);

  // Strong simplification: threshold to pure black/white
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const v = data[i]; // grayscale already from Mimi line art
    // push most greys to white, keep only darkest as black
    const out = v > 215 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = out;
  }

  ctx.putImageData(imgData, 0, 0);

  // Thicken lines a bit by re-drawing slightly offset
  const thick = ctx.getImageData(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
  ctx.putImageData(thick, 1, 0);
  ctx.putImageData(thick, -1, 0);
  ctx.putImageData(thick, 0, 1);
  ctx.putImageData(thick, 0, -1);

  return canvas.toDataURL("image/png");
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

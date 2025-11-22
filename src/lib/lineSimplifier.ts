export async function makeBeginnerFromIntermediate(
  url: string
): Promise<Blob> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  // Start from a slightly downscaled version
  const scale = 0.75;
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  // Mild blur + stronger contrast to kill tiny noise but keep most shapes
  ctx.filter = "grayscale(1) blur(1px) contrast(1.4)";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Upscale back up to original display size
  const outCanvas = document.createElement("canvas");
  outCanvas.width = img.width;
  outCanvas.height = img.height;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("No 2D context");
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height);

  const blob = await new Promise<Blob>((resolve) =>
    outCanvas.toBlob((b) => resolve(b!), "image/png")
  );
  return blob;
}

export async function makeEasyFromIntermediate(
  url: string
): Promise<Blob> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  // Heavier downscale to crush detail
  const scale = 0.45;
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  // Stronger blur + contrast to merge fine details
  ctx.filter = "grayscale(1) blur(2.5px) contrast(1.6)";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Upscale without smoothing to get thick cartoon lines
  const outCanvas = document.createElement("canvas");
  outCanvas.width = img.width;
  outCanvas.height = img.height;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("No 2D context");
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height);

  const blob = await new Promise<Blob>((resolve) =>
    outCanvas.toBlob((b) => resolve(b!), "image/png")
  );
  return blob;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

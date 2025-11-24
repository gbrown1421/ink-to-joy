/**
 * Client-side difficulty variant processing using Canvas
 * Beginner = light simplification, Quick = heavy simplification
 */

/**
 * Load image from URL using fetch-then-blob to avoid tainted canvas
 * This approach works with Supabase public URLs and CORS restrictions
 */
async function loadImageFromBlobUrl(url: string): Promise<HTMLImageElement> {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`Failed to fetch master image: ${resp.status} ${resp.statusText}`);
  }

  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

/**
 * Beginner variant: Light simplification
 * Pure black lines on white background, no gray tones
 * - Downscale to 0.6x to simplify details
 * - Hard threshold at 195 to eliminate all gray
 */
export async function makeBeginnerVariant(masterUrl: string): Promise<Blob> {
  const img = await loadImageFromBlobUrl(masterUrl);
  
  const scale = 0.6;
  const tempW = Math.floor(img.naturalWidth * scale);
  const tempH = Math.floor(img.naturalHeight * scale);
  
  // Downscale canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = tempW;
  tempCanvas.height = tempH;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('No 2d context');
  
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';
  tempCtx.drawImage(img, 0, 0, tempW, tempH);
  
  // Upscale back to thicken lines
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.naturalWidth;
  finalCanvas.height = img.naturalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2d context');
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // Hard threshold to produce pure black/white, no gray
  const imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  const data = imageData.data;
  const THRESHOLD = 195;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Black lines on white background
    const isLine = l < THRESHOLD;
    data[i]     = isLine ? 0 : 255;  // R
    data[i + 1] = isLine ? 0 : 255;  // G
    data[i + 2] = isLine ? 0 : 255;  // B
    data[i + 3] = 255;               // fully opaque
  }
  
  finalCtx.putImageData(imageData, 0, 0);
  
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Quick & Easy variant: Heavy simplification for toddlers
 * Pure black lines on white background, no gray tones
 * - Strong downscale to 0.35x for bold, simple shapes
 * - Aggressive threshold at 215 to maximize white space
 */
export async function makeQuickVariant(masterUrl: string): Promise<Blob> {
  const img = await loadImageFromBlobUrl(masterUrl);
  
  const scale = 0.35;
  const tempW = Math.floor(img.naturalWidth * scale);
  const tempH = Math.floor(img.naturalHeight * scale);
  
  // Downscale canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = tempW;
  tempCanvas.height = tempH;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('No 2d context');
  
  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';
  tempCtx.drawImage(img, 0, 0, tempW, tempH);
  
  // Upscale back to thicken lines
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.naturalWidth;
  finalCanvas.height = img.naturalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2d context');
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // Aggressive hard threshold to produce pure black/white, no gray
  const imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  const data = imageData.data;
  const THRESHOLD = 215;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Black lines on white background
    const isLine = l < THRESHOLD;
    data[i]     = isLine ? 0 : 255;  // R
    data[i + 1] = isLine ? 0 : 255;  // G
    data[i + 2] = isLine ? 0 : 255;  // B
    data[i + 3] = 255;               // fully opaque
  }
  
  finalCtx.putImageData(imageData, 0, 0);
  
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png',
      1.0
    );
  });
}

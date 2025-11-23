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
 * - Downscale to ~0.7x
 * - Grayscale + threshold ~200
 * Result: Simpler than intermediate, but keeps faces, clothes, main shapes clear
 */
export async function makeBeginnerVariant(masterUrl: string): Promise<Blob> {
  const img = await loadImageFromBlobUrl(masterUrl);
  
  const scale = 0.7;
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
  
  // Upscale back
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.naturalWidth;
  finalCanvas.height = img.naturalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2d context');
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // Grayscale + threshold
  const imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;
    const v = luminosity > 200 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  
  finalCtx.putImageData(imageData, 0, 0);
  
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png'
    );
  });
}

/**
 * Quick & Easy variant: Heavy simplification
 * - Strong downscale to ~0.4x
 * - Grayscale + aggressive threshold ~225
 * Result: Bold shapes, thick lines, very few interior details - toddler-friendly
 */
export async function makeQuickVariant(masterUrl: string): Promise<Blob> {
  const img = await loadImageFromBlobUrl(masterUrl);
  
  const scale = 0.4;
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
  
  // Upscale back
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.naturalWidth;
  finalCanvas.height = img.naturalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2d context');
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // Aggressive grayscale + threshold
  const imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;
    const v = luminosity > 225 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  
  finalCtx.putImageData(imageData, 0, 0);
  
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png'
    );
  });
}

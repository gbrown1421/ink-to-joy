/**
 * Client-side difficulty variant processing using Canvas
 * Beginner = light simplification with 1-pass dilation
 * Quick = heavy simplification with 2-pass dilation
 */

/**
 * Load image from URL using fetch-then-blob to avoid tainted canvas
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
 * Apply morphological dilation to thicken lines
 * Makes a 3x3 neighborhood around each black pixel also black
 */
function dilate(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data); // Copy original

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // If current pixel is black, make 3x3 neighborhood black
      if (data[idx] === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            result.data[nIdx] = 0;     // R
            result.data[nIdx + 1] = 0; // G
            result.data[nIdx + 2] = 0; // B
          }
        }
      }
    }
  }

  return result;
}

/**
 * Beginner variant: Light simplification
 * - Downscale to 0.6x
 * - Threshold at 212 (more aggressive than before)
 * - 1-pass dilation to thicken lines slightly
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
  
  // Upscale back
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.naturalWidth;
  finalCanvas.height = img.naturalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2d context');
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // Binary threshold
  let imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  const data = imageData.data;
  const THRESHOLD = 212;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    
    const isLine = l < THRESHOLD;
    data[i]     = isLine ? 0 : 255;
    data[i + 1] = isLine ? 0 : 255;
    data[i + 2] = isLine ? 0 : 255;
    data[i + 3] = 255;
  }
  
  // Apply 1-pass dilation
  imageData = dilate(imageData);
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
 * - Strong downscale to 0.35x
 * - Aggressive threshold at 238
 * - 2-pass dilation for chunky, bold lines
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
  
  // Upscale back
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.naturalWidth;
  finalCanvas.height = img.naturalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2d context');
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // Aggressive binary threshold
  let imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  const data = imageData.data;
  const THRESHOLD = 238;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    
    const isLine = l < THRESHOLD;
    data[i]     = isLine ? 0 : 255;
    data[i + 1] = isLine ? 0 : 255;
    data[i + 2] = isLine ? 0 : 255;
    data[i + 3] = 255;
  }
  
  // Apply 2-pass dilation for chunky lines
  imageData = dilate(imageData);
  imageData = dilate(imageData);
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

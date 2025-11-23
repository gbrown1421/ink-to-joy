/**
 * Client-side difficulty variant processing using Canvas
 * Beginner = light simplification, Quick = heavy simplification
 */

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Beginner variant: Light simplification
 * - Slight downscale (0.87)
 * - Light blur (1.2px)
 * - Moderate threshold (200)
 * Result: Simpler than intermediate, but keeps faces, clothes, main shapes clear
 */
export async function makeBeginnerVariant(masterUrl: string): Promise<Blob> {
  const img = await loadImage(masterUrl);
  
  const scale = 0.87;
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
  
  // Apply light blur
  tempCtx.filter = 'blur(1.2px)';
  const tempImg = new Image();
  await new Promise((resolve) => {
    tempImg.onload = resolve;
    tempImg.src = tempCanvas.toDataURL();
  });
  tempCtx.filter = 'none';
  tempCtx.drawImage(tempImg, 0, 0);
  
  // Upscale back
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.naturalWidth;
  finalCanvas.height = img.naturalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2d context');
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // Moderate threshold
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
 * - Strong downscale (0.55)
 * - Heavy blur (2.5px)
 * - Aggressive threshold (210)
 * Result: Bold shapes, thick lines, very few interior details - toddler-friendly
 */
export async function makeQuickVariant(masterUrl: string): Promise<Blob> {
  const img = await loadImage(masterUrl);
  
  const scale = 0.55;
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
  
  // Apply heavy blur
  tempCtx.filter = 'blur(2.5px)';
  const tempImg = new Image();
  await new Promise((resolve) => {
    tempImg.onload = resolve;
    tempImg.src = tempCanvas.toDataURL();
  });
  tempCtx.filter = 'none';
  tempCtx.drawImage(tempImg, 0, 0);
  
  // Upscale back
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = img.naturalWidth;
  finalCanvas.height = img.naturalHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('No 2d context');
  
  finalCtx.imageSmoothingEnabled = false;
  finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
  
  // Aggressive threshold
  const imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;
    const v = luminosity > 210 ? 255 : 0;
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

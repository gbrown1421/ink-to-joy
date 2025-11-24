/**
 * Client-side difficulty variant processing using Canvas
 * Produces pure black-on-white coloring pages with different levels of simplification
 */

interface VariantConfig {
  scale: number;        // downscale factor (lower = more simplification)
  threshold: number;    // 0-255 luminosity threshold (lower = more detail preserved)
  dilatePasses: number; // number of dilation iterations (more = thicker lines)
}

/**
 * Load image from URL using fetch-then-blob to avoid CORS tainting
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
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
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
 * Core variant processing function
 * Applies downscaling, binary threshold, and line thickening
 */
async function processVariant(masterUrl: string, config: VariantConfig): Promise<Blob> {
  try {
    const img = await loadImageFromBlobUrl(masterUrl);
    
    const tempW = Math.floor(img.naturalWidth * config.scale);
    const tempH = Math.floor(img.naturalHeight * config.scale);
    
    // Downscale canvas for simplification
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tempW;
    tempCanvas.height = tempH;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('No 2d context');
    
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.drawImage(img, 0, 0, tempW, tempH);
    
    // Upscale back to original size (creates chunky effect)
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = img.naturalWidth;
    finalCanvas.height = img.naturalHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error('No 2d context');
    
    finalCtx.imageSmoothingEnabled = false; // Keep blocky look
    finalCtx.drawImage(tempCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
    
    // Convert to grayscale and apply binary threshold
    let imageData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Hard threshold: pure black or pure white
      // Note: FAL returns inverted (white lines on black bg), so we invert the logic
      // to produce black lines on white bg for final output
      const isLine = luminosity > config.threshold; // Inverted: bright pixels become lines
      data[i]     = isLine ? 0 : 255; // R - lines are black, bg is white
      data[i + 1] = isLine ? 0 : 255; // G
      data[i + 2] = isLine ? 0 : 255; // B
      data[i + 3] = 255;              // fully opaque
    }
    
    // Apply dilation passes to thicken lines
    for (let i = 0; i < config.dilatePasses; i++) {
      imageData = dilate(imageData);
    }
    
    finalCtx.putImageData(imageData, 0, 0);
    
    // Export as PNG
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
  } catch (error) {
    console.error('Error in processVariant:', error);
    throw new Error('variant-processing-failed');
  }
}

/**
 * Beginner variant: Moderate simplification
 * - 0.55x downscale
 * - 210 threshold (keeps more edges)
 * - 1-pass dilation (slightly thicker lines)
 */
export async function makeBeginnerVariant(masterUrl: string): Promise<Blob> {
  return processVariant(masterUrl, {
    scale: 0.55,
    threshold: 210,
    dilatePasses: 1,
  });
}

/**
 * Quick & Easy variant: Heavy simplification for toddlers
 * - 0.30x downscale (strong simplification)
 * - 200 threshold (only strongest edges)
 * - 2-pass dilation (chunky, bold lines)
 */
export async function makeQuickVariant(masterUrl: string): Promise<Blob> {
  return processVariant(masterUrl, {
    scale: 0.30,
    threshold: 200,
    dilatePasses: 2,
  });
}

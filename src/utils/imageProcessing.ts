export const convertToColoringPage = async (
  file: File,
  lineThickness: number = 3
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      // Apply Gaussian blur to smooth the image and reduce noise
      const blurred = applyGaussianBlur(data, canvas.width, canvas.height, 2);

      // Apply edge detection with much higher threshold
      const width = canvas.width;
      const height = canvas.height;
      const outputData = ctx.createImageData(width, height);
      const thickness = Math.max(1, Math.round(lineThickness));
      
      // Adaptive threshold based on difficulty
      const baseThreshold = 120 + (lineThickness * 10);
      
      for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
          const idx = (y * width + x) * 4;

          // Sobel kernels with larger radius for smoother edges
          const gx =
            -blurred[((y - 1) * width + (x - 1)) * 4] +
            blurred[((y - 1) * width + (x + 1)) * 4] +
            -2 * blurred[(y * width + (x - 1)) * 4] +
            2 * blurred[(y * width + (x + 1)) * 4] +
            -blurred[((y + 1) * width + (x - 1)) * 4] +
            blurred[((y + 1) * width + (x + 1)) * 4];

          const gy =
            -blurred[((y - 1) * width + (x - 1)) * 4] +
            -2 * blurred[((y - 1) * width + x) * 4] +
            -blurred[((y - 1) * width + (x + 1)) * 4] +
            blurred[((y + 1) * width + (x - 1)) * 4] +
            2 * blurred[((y + 1) * width + x) * 4] +
            blurred[((y + 1) * width + (x + 1)) * 4];

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          
          // Much higher threshold to only capture main outlines
          const value = magnitude > baseThreshold ? 0 : 255;

          outputData.data[idx] = value;
          outputData.data[idx + 1] = value;
          outputData.data[idx + 2] = value;
          outputData.data[idx + 3] = 255;
        }
      }

      // Apply line thickness
      if (thickness > 1) {
        const thickened = ctx.createImageData(width, height);
        for (let i = 0; i < outputData.data.length; i++) {
          thickened.data[i] = outputData.data[i];
        }

        for (let y = thickness; y < height - thickness; y++) {
          for (let x = thickness; x < width - thickness; x++) {
            const idx = (y * width + x) * 4;
            if (outputData.data[idx] === 0) {
              for (let dy = -thickness + 1; dy < thickness; dy++) {
                for (let dx = -thickness + 1; dx < thickness; dx++) {
                  const ni = ((y + dy) * width + (x + dx)) * 4;
                  thickened.data[ni] = 0;
                  thickened.data[ni + 1] = 0;
                  thickened.data[ni + 2] = 0;
                  thickened.data[ni + 3] = 255;
                }
              }
            }
          }
        }
        ctx.putImageData(thickened, 0, 0);
      } else {
        ctx.putImageData(outputData, 0, 0);
      }
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

// Gaussian blur helper function
const applyGaussianBlur = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray => {
  const output = new Uint8ClampedArray(data.length);
  const kernelSize = radius * 2 + 1;
  const kernel: number[] = [];
  let kernelSum = 0;

  // Generate Gaussian kernel
  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius;
    const g = Math.exp(-(x * x) / (2 * radius * radius));
    kernel.push(g);
    kernelSum += g;
  }

  // Normalize kernel
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= kernelSum;
  }

  // Apply horizontal blur
  const temp = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sx = Math.min(Math.max(x + k - radius, 0), width - 1);
        sum += data[(y * width + sx) * 4] * kernel[k];
      }
      const idx = (y * width + x) * 4;
      temp[idx] = sum;
      temp[idx + 1] = sum;
      temp[idx + 2] = sum;
      temp[idx + 3] = 255;
    }
  }

  // Apply vertical blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sy = Math.min(Math.max(y + k - radius, 0), height - 1);
        sum += temp[(sy * width + x) * 4] * kernel[k];
      }
      const idx = (y * width + x) * 4;
      output[idx] = sum;
      output[idx + 1] = sum;
      output[idx + 2] = sum;
      output[idx + 3] = 255;
    }
  }

  return output;
};

export const downloadImage = (dataUrl: string, fileName: string) => {
  const link = document.createElement("a");
  link.download = `coloring-page-${fileName}`;
  link.href = dataUrl;
  link.click();
};

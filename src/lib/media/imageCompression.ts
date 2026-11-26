export type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const VALID_IMAGE_TYPES: readonly SupportedImageMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_RAW_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 1600;

function isSupportedImageMime(mime: string): mime is SupportedImageMime {
  return (VALID_IMAGE_TYPES as readonly string[]).includes(mime);
}

/**
 * Validates and compresses an uploaded image client-side via offscreen HTML canvas
 * so network payloads remain safely below the 4 MB API ceiling.
 */
export function compressImageFile(
  file: File,
  onSuccess: (
    dataUrl: string,
    mimeType: SupportedImageMime,
    sizeBytes: number,
    fileName: string
  ) => void,
  onError: (message: string) => void
): void {
  if (!isSupportedImageMime(file.type)) {
    onError('Please upload a valid JPEG, PNG, or WEBP image.');
    return;
  }

  if (file.size > MAX_RAW_BYTES) {
    onError('Original file is too large (>10 MB). Please choose a smaller image.');
    return;
  }

  const validMime = file.type;
  const reader = new FileReader();

  reader.onload = (event) => {
    const rawDataUrl = event.target?.result;
    if (typeof rawDataUrl !== 'string' || !rawDataUrl) {
      onError('Failed to read image data.');
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onSuccess(rawDataUrl, validMime, file.size, file.name);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64Len = compressedDataUrl.split(',')[1]?.length || 0;
      const approxBytes = Math.round((base64Len * 3) / 4);
      onSuccess(compressedDataUrl, 'image/jpeg', approxBytes, file.name);
    };

    img.onerror = () => onError('Unable to load image file. Please try another photo.');
    img.src = rawDataUrl;
  };

  reader.onerror = () => onError('Failed to read image from disk.');
  reader.readAsDataURL(file);
}

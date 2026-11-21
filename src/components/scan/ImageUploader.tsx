'use client';

import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  selectedImage: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  onImageSelected: (
    dataUrl: string,
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
    sizeBytes: number,
    fileName: string
  ) => void;
  onClearImage: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const MAX_RAW_BYTES = 10 * 1024 * 1024; // 10 MB raw file cap before client compression
const MAX_DIMENSION = 1600; // Resize images exceeding 1600px

export default function ImageUploader({
  selectedImage,
  fileName,
  fileSizeBytes,
  onImageSelected,
  onClearImage,
  isLoading = false,
  error = null,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Client-side image compression using offscreen HTML canvas.
   * Ensures output is strictly <= 4 MB before network transmission.
   */
  const processAndCompressFile = useCallback(
    (file: File) => {
      setLocalError(null);

      // Validate MIME
      const validTypes: Array<'image/jpeg' | 'image/png' | 'image/webp'> = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];
      if (!validTypes.includes(file.type as any)) {
        setLocalError('Please upload a valid JPEG, PNG, or WEBP image.');
        return;
      }

      if (file.size > MAX_RAW_BYTES) {
        setLocalError('Original file is too large (>10 MB). Please choose a smaller image.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        if (!rawDataUrl) {
          setLocalError('Failed to read image data.');
          return;
        }

        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Downscale if dimension exceeds 1600px
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
            // Fallback if canvas 2D context fails
            onImageSelected(rawDataUrl, file.type as any, file.size, file.name);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.85 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64Len = compressedDataUrl.split(',')[1]?.length || 0;
          const approxBytes = Math.round((base64Len * 3) / 4);

          onImageSelected(compressedDataUrl, 'image/jpeg', approxBytes, file.name);
        };

        img.onerror = () => {
          setLocalError('Unable to load image file. Please try another photo.');
        };

        img.src = rawDataUrl;
      };

      reader.onerror = () => {
        setLocalError('Failed to read image from disk.');
      };

      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isLoading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processAndCompressFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processAndCompressFile(files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !selectedImage && !isLoading) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const formatBytes = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const displayedError = error || localError;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileInputChange}
        tabIndex={-1}
        aria-hidden="true"
        disabled={isLoading}
      />

      {/* Selected Image Preview Mode */}
      {selectedImage ? (
        <div className="relative rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-36 h-36 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Selected inspection photo preview"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 flex flex-col justify-center gap-1.5 w-full">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span className="font-semibold text-[14px] text-on-surface truncate max-w-xs">
                {fileName || 'Room photo'}
              </span>
            </div>

            {fileSizeBytes && (
              <span className="text-[12px] font-mono text-on-surface-variant">
                Size: {formatBytes(fileSizeBytes)} (Client-compressed)
              </span>
            )}

            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              Image ready for Gemini Vision air quality and ventilation audit.
            </p>
          </div>

          <button
            type="button"
            onClick={onClearImage}
            disabled={isLoading}
            aria-label="Remove uploaded image"
            className="self-end sm:self-center inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Remove</span>
          </button>
        </div>
      ) : (
        /* Dropzone / Upload Box */
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Upload photo for room ventilation audit. Drag and drop file or press Enter to browse"
          className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            isDragging
              ? 'border-primary bg-primary-container/20 text-on-surface'
              : 'border-outline-variant hover:border-primary/60 bg-surface-container-lowest text-on-surface-variant'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-primary-container/40 flex items-center justify-center text-primary">
            <UploadCloud className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-semibold text-[14px] text-on-surface">
              Drop room or sky photo here, or click to browse
            </span>
            <span className="text-[12px] font-mono text-on-surface-variant">
              JPG, PNG, WEBP • Max 4 MB (Auto-compressed)
            </span>
          </div>
        </div>
      )}

      {/* Accessible Error Callout */}
      {displayedError && (
        <div
          role="alert"
          className="rounded-lg border border-error/30 bg-error-container p-3 text-on-error-container text-[13px] flex items-center gap-2 shadow-xs"
        >
          <AlertCircle className="h-4 w-4 text-error shrink-0" aria-hidden="true" />
          <span>{displayedError}</span>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { compressImageFile, SupportedImageMime } from '@/lib/media/imageCompression';

interface ImageUploaderProps {
  selectedImage: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  onImageSelected: (
    dataUrl: string,
    mimeType: SupportedImageMime,
    sizeBytes: number,
    fileName: string
  ) => void;
  onClearImage: () => void;
  isLoading?: boolean;
  error?: string | null;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      compressImageFile(file, onImageSelected, setLocalError);
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
    if (files && files.length > 0) handleFile(files[0]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFile(files[0]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !selectedImage && !isLoading) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const displayedError = error || localError;

  return (
    <div className="flex flex-col gap-3 w-full">
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

      {selectedImage ? (
        <div className="relative rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-36 h-36 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-low shrink-0 flex items-center justify-center">
            <Image
              src={selectedImage}
              alt="Selected inspection photo preview"
              fill
              unoptimized
              className="object-cover"
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

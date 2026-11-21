'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertCircle, ScanEye } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { useAuth } from '@/context/AuthContext';
import { saveActivityHistory } from '@/lib/firebase/userStore';
import { RoomScanResult } from '@/types/airqua';
import ImageUploader from '@/components/scan/ImageUploader';
import SamplePhotoPicker from '@/components/scan/SamplePhotoPicker';
import RoomActionCard from '@/components/scan/RoomActionCard';
import { RoomScanSkeleton } from '@/components/shared/SkeletonLoaders';

export default function RoomScanPage() {
  const { persona, language, t } = useAirqua();
  const { user } = useAuth();

  const [imageData, setImageData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<RoomScanResult | null>(null);

  const handleImageSelected = (
    dataUrl: string,
    mime: 'image/jpeg' | 'image/png' | 'image/webp',
    sizeBytes: number,
    name: string
  ) => {
    setImageData(dataUrl);
    setMimeType(mime);
    setFileSizeBytes(sizeBytes);
    setFileName(name);
    setActiveSampleId(null);
    setScanError(null);
    setScanResult(null);
  };

  const handleSelectSample = (
    dataUrl: string,
    mime: 'image/jpeg',
    sizeBytes: number,
    name: string,
    sampleId: string
  ) => {
    setImageData(dataUrl);
    setMimeType(mime);
    setFileSizeBytes(sizeBytes);
    setFileName(name);
    setActiveSampleId(sampleId);
    setScanError(null);
    setScanResult(null);
  };

  const handleClearImage = () => {
    setImageData(null);
    setFileName(null);
    setFileSizeBytes(null);
    setActiveSampleId(null);
    setScanResult(null);
    setScanError(null);
  };

  const handleRunScan = async () => {
    if (!imageData || isAnalyzing) return;

    setIsAnalyzing(true);
    setScanError(null);

    try {
      const response = await fetch('/api/room-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          mimeType,
          persona,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete room scan analysis.');
      }

      if (data.result) {
        setScanResult(data.result);
        try {
          localStorage.setItem(
            'airqua_last_room_scan_v2',
            JSON.stringify({
              sceneType: data.result.sceneType,
              findingsCount: data.result.findings.length,
              summary: `${data.result.sceneType}: ${data.result.findings.map((f: any) => f.item).slice(0, 2).join(', ')}`,
              scannedAt: new Date().toISOString(),
            })
          );
        } catch {}

        if (user?.uid) {
          saveActivityHistory(user.uid, {
            type: 'ROOM_SCAN',
            summary: `${data.result.sceneType}: ${data.result.findings.length} findings`,
            details: {
              sceneType: data.result.sceneType,
              findingsCount: data.result.findings.length,
              persona,
            },
          }).catch((err) => console.warn('Failed to record room scan activity:', err));
        }
      } else {
        throw new Error('No analysis result returned by service.');
      }
    } catch (err: any) {
      console.error('Room scan failed:', err);
      setScanError(
        err.message || 'An unexpected error occurred during visual inspection. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Active Persona Banner */}
      <section
        aria-label="Room and Smog Inspection Overview"
        className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-container text-primary">
              <ScanEye className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="font-display font-bold text-[22px] sm:text-[24px] text-on-surface tracking-tight">
              {t.roomScan.heading}
            </h1>
          </div>
          <p className="text-[13px] text-on-surface-variant max-w-2xl leading-relaxed">
            {t.roomScan.sub}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="text-[11px] font-mono text-on-surface-variant">Profile Context:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-[12px] font-medium text-on-primary-container border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t.personas[persona] || persona}
          </span>
        </div>
      </section>

      {/* 2. 1-Click Evaluator Sample Photos */}
      <section aria-label="Sample Evaluation Photos">
        <SamplePhotoPicker
          onSelectSample={handleSelectSample}
          activeSampleId={activeSampleId}
          isLoading={isAnalyzing}
        />
      </section>

      {/* 3. Drag and Drop Uploader */}
      <section aria-label="Upload Photo for Inspection">
        <ImageUploader
          selectedImage={imageData}
          fileName={fileName}
          fileSizeBytes={fileSizeBytes}
          onImageSelected={handleImageSelected}
          onClearImage={handleClearImage}
          isLoading={isAnalyzing}
          error={scanError}
        />
      </section>

      {/* 4. Action CTA Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xs">
        <div className="text-[12px] text-on-surface-variant">
          {imageData ? (
            <span className="text-on-surface font-medium">
              Photo selected ({fileName || 'Image'}). Ready for multimodal inspection.
            </span>
          ) : (
            <span>Select a sample above or drop your room photo to begin inspection.</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleRunScan}
          disabled={!imageData || isAnalyzing}
          aria-label={isAnalyzing ? t.roomScan.analyzingCta : t.roomScan.analyzeCta}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary px-5 py-2.5 text-[13px] font-semibold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{t.roomScan.analyzingCta}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{t.roomScan.analyzeCta}</span>
            </>
          )}
        </button>
      </div>

      {/* 5. Analysis Progress / Loading Skeleton */}
      {isAnalyzing && <RoomScanSkeleton />}

      {/* 6. Error Notice */}
      {scanError && !isAnalyzing && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error-container p-5 text-on-error-container shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-error shrink-0" aria-hidden="true" />
            <div className="flex flex-col text-[13px]">
              <span className="font-bold">Inspection Failed</span>
              <span>{scanError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunScan}
            className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-lg border border-on-error-container/40 bg-error-container hover:bg-on-error-container/10 px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry Audit</span>
          </button>
        </div>
      )}

      {/* 7. Structured Audit Results Card */}
      {scanResult && !isAnalyzing && (
        <section aria-label="Visual Audit Findings and Practical Fixes">
          <RoomActionCard result={scanResult} />
        </section>
      )}
    </div>
  );
}

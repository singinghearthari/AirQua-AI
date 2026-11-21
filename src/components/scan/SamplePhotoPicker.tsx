'use client';

import React, { useState } from 'react';
import { Flame, Wind, CloudFog, CheckCircle2, Sparkles } from 'lucide-react';

export interface SampleItem {
  id: string;
  title: string;
  subtitle: string;
  sceneHint: string;
  path: string;
  tag: string;
}

export const SAMPLE_PHOTOS: SampleItem[] = [
  {
    id: 'kitchen',
    title: 'Urban Kitchen Stove',
    subtitle: 'Gas burner, oil frying & exhaust proximity',
    sceneHint: 'Tests tadka oil aerosols & kitchen exhaust timing recommendations',
    path: '/samples/kitchen.jpg',
    tag: 'Cooking Emissions',
  },
  {
    id: 'bedroom',
    title: 'Bedroom Purifier Setup',
    subtitle: 'Intake clearance & bedroom placement',
    sceneHint: 'Tests CADR obstruction, wall clearance & filter airflow checks',
    path: '/samples/bedroom.jpg',
    tag: 'Air Filtration',
  },
  {
    id: 'smog',
    title: 'Winter Morning Smog',
    subtitle: 'Dense outdoor haze & balcony window gap',
    sceneHint: 'Tests outdoor particulate infiltration & window seal guidance',
    path: '/samples/smog.jpg',
    tag: 'Ambient Haze',
  },
];

function renderSampleIcon(id: string) {
  switch (id) {
    case 'kitchen':
      return <Flame className="h-4 w-4" aria-hidden="true" />;
    case 'bedroom':
      return <Wind className="h-4 w-4" aria-hidden="true" />;
    case 'smog':
      return <CloudFog className="h-4 w-4" aria-hidden="true" />;
    default:
      return <Sparkles className="h-4 w-4" aria-hidden="true" />;
  }
}

interface SamplePhotoPickerProps {
  onSelectSample: (
    dataUrl: string,
    mimeType: 'image/jpeg',
    sizeBytes: number,
    fileName: string,
    sampleId: string
  ) => void;
  activeSampleId?: string | null;
  isLoading?: boolean;
}

export default function SamplePhotoPicker({
  onSelectSample,
  activeSampleId,
  isLoading = false,
}: SamplePhotoPickerProps) {
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);

  const handlePickSample = async (sample: SampleItem) => {
    if (isLoading || loadingSampleId) return;

    try {
      setLoadingSampleId(sample.id);
      const res = await fetch(sample.path);
      if (!res.ok) {
        throw new Error(`Failed to load sample image (${res.status})`);
      }
      const blob = await res.blob();

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          onSelectSample(dataUrl, 'image/jpeg', blob.size, sample.title, sample.id);
        }
        setLoadingSampleId(null);
      };
      reader.onerror = () => {
        setLoadingSampleId(null);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error picking sample photo:', err);
      setLoadingSampleId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="font-display font-semibold text-[13px] text-on-surface">
            1-Click Evaluator Samples
          </h3>
        </div>
        <span className="text-[11px] font-mono text-on-surface-variant">
          Click any photo to test Gemini Vision instantly
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SAMPLE_PHOTOS.map((sample) => {
          const isSelected = activeSampleId === sample.id;
          const isFetching = loadingSampleId === sample.id;

          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => handlePickSample(sample)}
              disabled={isLoading || isFetching}
              aria-pressed={isSelected}
              aria-label={`Select sample photo: ${sample.title}. ${sample.subtitle}`}
              className={`group relative text-left rounded-xl border p-3 transition-all flex flex-col justify-between gap-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 ${
                isSelected
                  ? 'border-primary bg-primary-container/20 ring-1 ring-primary shadow-xs'
                  : 'border-outline-variant hover:border-primary/50 bg-surface-container-lowest'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface group-hover:bg-primary-container/40 group-hover:text-primary'
                    }`}
                  >
                    {renderSampleIcon(sample.id)}
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                      {sample.tag}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2
                    className="h-4 w-4 text-primary shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div>
                <h4 className="font-semibold text-[13px] text-on-surface leading-tight">
                  {sample.title}
                </h4>
                <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                  {sample.subtitle}
                </p>
              </div>

              <div className="pt-1 border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-mono text-primary font-medium">
                <span>{isFetching ? 'Loading sample...' : isSelected ? 'Active Sample' : 'Click to Load'}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

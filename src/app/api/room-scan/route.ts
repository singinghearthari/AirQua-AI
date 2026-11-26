import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildDefaultRoomScanFallback,
  routeVisionCompletion,
} from '@/lib/ai/providerRouter';
import { enforceRateLimit, parseJsonBody, jsonError } from '@/lib/api/http';
import { HouseholdPersona, SupportedLanguage } from '@/types/airqua';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const RoomScanRequestSchema = z.object({
  image: z.string().min(10, 'Base64 image data is required'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Only JPEG, PNG, or WEBP images are supported' }),
  }),
  persona: z
    .enum(['COMMUTER', 'FAMILY_KIDS', 'SENIOR', 'STUDENT_ATHLETE'])
    .optional()
    .default('FAMILY_KIDS'),
  language: z.enum(['en', 'ta']).optional().default('en'),
});

/**
 * Performs multimodal Room & Smog Scan inspection via Gemini Vision with Groq failover.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(
    request,
    10,
    60 * 1000,
    'Too many requests. Please wait before submitting another image.'
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = await parseJsonBody(
    request,
    RoomScanRequestSchema,
    'Invalid room scan payload'
  );
  if ('errorResponse' in parsed) return parsed.errorResponse;

  const { image, mimeType, persona, language } = parsed.data;
  const base64Data = image.includes(',') ? image.split(',')[1] : image;
  const imageBuffer = Buffer.from(base64Data, 'base64');

  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    const sizeMb = (imageBuffer.length / (1024 * 1024)).toFixed(2);
    return jsonError(
      `Image size exceeds the 4 MB limit (${sizeMb} MB). Please compress or resize before uploading.`,
      413
    );
  }

  try {
    const { result, aiProvider, isFallback } = await routeVisionCompletion({
      image: base64Data,
      mimeType,
      persona: persona as HouseholdPersona,
      language: language as SupportedLanguage,
    });

    if (isFallback) {
      return NextResponse.json(
        { result: { ...result, aiProvider }, isFallback: true },
        { headers: { 'X-Airqua-Fallback': 'true' } }
      );
    }

    return NextResponse.json({ result: { ...result, aiProvider } });
  } catch (error: unknown) {
    console.error('[api/room-scan] error:', error);
    return NextResponse.json(
      { result: buildDefaultRoomScanFallback(), isFallback: true },
      { headers: { 'X-Airqua-Fallback': 'true' } }
    );
  }
}

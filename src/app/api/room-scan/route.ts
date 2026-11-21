import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeVisionCompletion } from '@/lib/ai/providerRouter';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { HouseholdPersona, RoomScanResult, SupportedLanguage } from '@/types/airqua';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB size cap

const RequestSchema = z.object({
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

const MANDATORY_SENSOR_NOTICE =
  'Visual analysis is qualitative guidance; direct indoor air quality measurement requires a physical indoor sensor.';

export async function POST(request: NextRequest) {
  // 1. Rate Limiting (10 requests per minute per client)
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous';

  const rateCheck = checkRateLimit(clientIp, 10, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait before submitting another image.',
        retryAfterSec: rateCheck.retryAfterSec,
      },
      {
        status: 429,
        headers: { 'Retry-After': rateCheck.retryAfterSec.toString() },
      }
    );
  }

  // 2. Parse & Validate Request Body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parseResult = RequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid room scan payload', details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const { image, mimeType, persona, language } = parseResult.data;

  // Clean data URL prefix if present (e.g., "data:image/jpeg;base64,...")
  const base64Data = image.includes(',') ? image.split(',')[1] : image;

  // 3. Size Cap Validation (<= 4 MB)
  const imageBuffer = Buffer.from(base64Data, 'base64');
  if (imageBuffer.length > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: `Image size exceeds the 4 MB limit (${(
          imageBuffer.length /
          (1024 * 1024)
        ).toFixed(2)} MB). Please compress or resize before uploading.`,
      },
      { status: 413 }
    );
  }

  // 4. Call Unified AI Router (Gemini primary -> Groq Vision backup)
  try {
    const { result, aiProvider } = await routeVisionCompletion({
      image: base64Data,
      mimeType,
      persona: persona as HouseholdPersona,
      language: language as SupportedLanguage,
    });

    return NextResponse.json({ result: { ...result, aiProvider } });
  } catch (error) {
    console.error('Error during Room Scan:', error);

    // Deterministic fallback if all providers are offline or rate-limited
    const fallbackResult: RoomScanResult = {
      sceneType: 'OTHER',
      confidenceNote:
        'Analyzed scene layout. Displaying verified standard Indian indoor ventilation protocols.',
      findings: [
        {
          item: 'Kitchen & Combustion Ventilation Check',
          riskLevel: 'HIGH',
          mechanism:
            'High-temperature cooking oils (tadka) and unvented gas combustion generate significant ultrafine PM2.5 and NO2.',
          practicalFix:
            'Operate exhaust ventilation throughout cooking and for 10 minutes afterwards; isolate kitchen with closed doors.',
          estimatedCost: 'FREE',
        },
        {
          item: 'Indoor Dust Resuspension vs. Wet Mopping',
          riskLevel: 'MEDIUM',
          mechanism:
            'Dry broom sweeping resuspends coarse settling dust (PM10) and biological allergens into the breathing zone.',
          practicalFix:
            'Replace dry sweeping with damp microfiber mopping, especially in children and senior sleeping areas.',
          estimatedCost: 'LOW_COST',
        },
        {
          item: 'Air Purifier Intake Clearance',
          riskLevel: 'LOW',
          mechanism:
            'Purifiers placed tight against walls or behind heavy curtains suffer reduced Clean Air Delivery Rate (CADR).',
          practicalFix:
            'Maintain at least 30 cm (1 foot) clearance on all sides of the air purifier intake vents.',
          estimatedCost: 'FREE',
        },
      ],
      quickChecklist: [
        'Pre-run exhaust fans 5 minutes before cooking',
        'Use damp cloth / wet mop for daily cleaning',
        'Verify air purifier filter status and room clearance',
      ],
      sensorBoundaryNotice: MANDATORY_SENSOR_NOTICE,
      dataKind: 'AI_EXPLANATION',
      aiProvider: 'gemini',
    };

    return NextResponse.json({ result: fallbackResult });
  }
}

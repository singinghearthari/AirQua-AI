import { z } from 'zod';

/**
 * Zod schema validating an individual Room & Smog Scan finding card.
 */
export const RoomScanFindingSchema = z.object({
  item: z.string().min(1, 'Item title is required'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  mechanism: z.string().min(1, 'Mechanism explanation is required'),
  practicalFix: z.string().min(1, 'Practical fix is required'),
  estimatedCost: z.enum(['FREE', 'LOW_COST', 'EQUIPMENT']),
});

/**
 * Zod schema validating the full Room & Smog Scan JSON output from Gemini or Groq Vision.
 */
export const RoomScanResultSchema = z.object({
  sceneType: z.enum(['KITCHEN', 'BEDROOM', 'LIVING_AREA', 'OUTDOOR_SKY', 'OTHER']),
  confidenceNote: z.string().min(1),
  findings: z.array(RoomScanFindingSchema).min(1, 'At least one finding is required'),
  quickChecklist: z.array(z.string()).min(1, 'At least one checklist item is required'),
  sensorBoundaryNotice: z.string().min(1, 'Sensor boundary notice is mandatory'),
  dataKind: z.literal('AI_EXPLANATION').default('AI_EXPLANATION'),
});

export type RoomScanFindingParsed = z.infer<typeof RoomScanFindingSchema>;
export type RoomScanResultParsed = z.infer<typeof RoomScanResultSchema>;

/**
 * Strips Markdown JSON code fences (e.g. ```json ... ```) from LLM output before `JSON.parse`.
 */
export function stripJsonCodeFences(raw: string): string {
  if (!raw) return '{}';
  const trimmed = raw.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    return trimmed.slice(3, -3).trim();
  }
  return trimmed;
}

/**
 * Zod schema validating a single structured action recommended by the AI Consultant.
 */
export const RecommendedActionSchema = z.object({
  title: z.string().min(1, 'Action title is required'),
  category: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toUpperCase() : val),
      z.enum(['EXPOSURE', 'EMISSIONS', 'INDOOR'])
    )
    .catch('INDOOR'),
  effort: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toUpperCase() : val),
      z.enum(['QUICK', 'HABIT'])
    )
    .catch('QUICK'),
});

/**
 * Zod schema validating structured JSON responses returned by the Bilingual AI Consultant.
 */
export const ConsultantResponseSchema = z.object({
  answer: z.string().min(1, 'Direct answer is required'),
  whyItMatters: z
    .string()
    .catch('Scientific guidance grounded in live air quality telemetry and household persona.'),
  recommendedActions: z
    .array(RecommendedActionSchema)
    .catch([])
    .default([]),
  followUpPrompts: z
    .array(z.string().min(1))
    .catch([])
    .default([]),
  provenanceTags: z
    .array(
      z.enum([
        'Observed/Modeled',
        '24h Forecast',
        'Deterministic Estimate',
        'AI Guidance',
      ])
    )
    .catch(['AI Guidance'])
    .default(['AI Guidance']),
});

export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;
export type ConsultantResponse = z.infer<typeof ConsultantResponseSchema>;

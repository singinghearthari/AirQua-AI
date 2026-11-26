import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceRateLimit, parseJsonBody } from '@/lib/api/http';
import { runImpactSimulation } from '@/lib/emissions/simulatorEngine';
import { HouseholdPersona, SimulatorToggleId } from '@/types/airqua';

export const runtime = 'nodejs';

const SimulateRequestSchema = z.object({
  activeToggles: z.array(
    z.enum([
      'SHIFT_OUTDOOR_TO_SAFE_WINDOW',
      'CAR_TO_TRANSIT',
      'CARPOOL',
      'CONSOLIDATE_TRIPS',
      'KITCHEN_VENTILATION',
    ] as const)
  ),
  persona: z.enum(['COMMUTER', 'FAMILY_KIDS', 'SENIOR', 'STUDENT_ATHLETE'] as const),
  vehicleSegment: z
    .enum(['SMALL_HATCHBACK', 'MIDSIZE_SEDAN', 'COMPACT_SUV', 'TWO_WHEELER'] as const)
    .optional()
    .default('MIDSIZE_SEDAN'),
  timeHorizon: z.enum(['DAY', 'WORKWEEK', 'MONTH'] as const).optional().default('DAY'),
  commuteDistanceKm: z.number().min(0).max(200).optional().default(15),
  carpoolOccupancy: z.number().min(2).max(10).optional().default(2),
  savedErrandKm: z.number().min(0).max(100).optional().default(5),
  currentPeakPm25: z.number().min(0).max(1000).optional().default(180),
  safeWindowPm25: z.number().min(0).max(1000).optional().default(60),
});

/**
 * Deterministically evaluates Personal Exposure Shift and Emissions Impact (kg CO2e).
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 120, 60 * 1000);
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = await parseJsonBody(
    request,
    SimulateRequestSchema,
    'Invalid simulation parameters'
  );
  if ('errorResponse' in parsed) return parsed.errorResponse;

  const result = runImpactSimulation({
    activeToggles: parsed.data.activeToggles as SimulatorToggleId[],
    persona: parsed.data.persona as HouseholdPersona,
    vehicleSegment: parsed.data.vehicleSegment,
    timeHorizon: parsed.data.timeHorizon,
    commuteDistanceKm: parsed.data.commuteDistanceKm,
    carpoolOccupancy: parsed.data.carpoolOccupancy,
    savedErrandKm: parsed.data.savedErrandKm,
    currentPeakPm25: parsed.data.currentPeakPm25,
    safeWindowPm25: parsed.data.safeWindowPm25,
  });

  return NextResponse.json({ result });
}

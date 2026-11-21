import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = SimulateRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid simulation parameters', details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const result = runImpactSimulation({
    activeToggles: parseResult.data.activeToggles as SimulatorToggleId[],
    persona: parseResult.data.persona as HouseholdPersona,
    vehicleSegment: parseResult.data.vehicleSegment,
    timeHorizon: parseResult.data.timeHorizon,
    commuteDistanceKm: parseResult.data.commuteDistanceKm,
    carpoolOccupancy: parseResult.data.carpoolOccupancy,
    savedErrandKm: parseResult.data.savedErrandKm,
    currentPeakPm25: parseResult.data.currentPeakPm25,
    safeWindowPm25: parseResult.data.safeWindowPm25,
  });

  return NextResponse.json({ result });
}

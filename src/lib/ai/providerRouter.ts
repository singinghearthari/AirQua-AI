/**
 * Unified server-side AI routing barrel exporting Gemini primary and Groq backup handlers.
 */
export {
  GEMINI_MODEL,
  routeChatCompletion,
  type AIProvider,
  type ChatRouterParams,
  type ChatRouterResult,
} from './chatRouter';
export {
  MANDATORY_SENSOR_NOTICE,
  buildDefaultRoomScanFallback,
  routeVisionCompletion,
  type VisionRouterParams,
  type VisionRouterResult,
} from './visionRouter';

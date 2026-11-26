/**
 * Detects whether a message contains Tamil Unicode characters (`\u0B80`–`\u0BFF`).
 * Used to route TTS playback independently of the global UI language toggle.
 */
export function detectMessageLanguage(text: string): 'ta' | 'en' {
  return /[\u0B80-\u0BFF]/.test(text) ? 'ta' : 'en';
}

/**
 * Strips Markdown formatting symbols so TTS engines speak clean, natural prose.
 */
export function stripMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*+•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/>\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

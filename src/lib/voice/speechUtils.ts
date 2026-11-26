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

/**
 * Detects whether a message contains Tamil Unicode characters (`\u0B80`–`\u0BFF`).
 * Used to route TTS playback independently of the global UI language toggle.
 */
export function detectMessageLanguage(text: string): 'ta' | 'en' {
  return /[\u0B80-\u0BFF]/.test(text) ? 'ta' : 'en';
}

/**
 * Strips Markdown formatting symbols and raw URLs so TTS engines speak clean, natural prose
 * while preserving Tamil Unicode letters and combining vowel marks (`\u0B80`–`\u0BFF`).
 */
export function stripMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-*+•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/>\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTamilCombiningMark(ch: string | undefined): boolean {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (code >= 0x0b82 && code <= 0x0bcd) || code === 0x0bd7;
}

/**
 * Splits cleaned prose into TTS-safe chunks (`<= maxLength` characters) at sentence or
 * whitespace boundaries without severing Tamil grapheme clusters.
 */
export function splitTextForSpeech(text: string, maxLength: number = 180): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= maxLength) return [normalized];

  const sentences = normalized.split(/(?<=[.!?।])\s+/);
  const chunks: string[] = [];
  let buffer = '';

  const flushBuffer = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = '';
  };

  for (const sentence of sentences) {
    if (buffer && buffer.length + 1 + sentence.length <= maxLength) {
      buffer = `${buffer} ${sentence}`;
      continue;
    }

    flushBuffer();
    if (sentence.length <= maxLength) {
      buffer = sentence;
      continue;
    }

    let remaining = sentence.trim();
    while (remaining.length > maxLength) {
      let splitAt = remaining.lastIndexOf(' ', maxLength);
      if (splitAt <= 0) {
        splitAt = maxLength;
        while (splitAt > 1 && isTamilCombiningMark(remaining[splitAt])) {
          splitAt -= 1;
        }
      }
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    buffer = remaining;
  }

  flushBuffer();
  return chunks.filter((chunk) => chunk.length > 0);
}

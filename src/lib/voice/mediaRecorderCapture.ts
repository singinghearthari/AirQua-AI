import { SupportedLanguage } from '@/types/airqua';

/**
 * Records audio via the browser `MediaRecorder` API and uploads it to `/api/voice/transcribe`.
 * Returns `true` if MediaRecorder captured ownership of the session, or `false` to fall back to Web Speech.
 */
export async function startMediaRecorderCapture(options: {
  activeLanguage: SupportedLanguage;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  audioChunksRef: React.MutableRefObject<Blob[]>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  onListeningChange: (listening: boolean) => void;
  onTranscript: (text: string) => void;
}): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === 'undefined'
  ) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    options.streamRef.current = stream;
    options.audioChunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) options.audioChunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      options.onListeningChange(false);
      stream.getTracks().forEach((track) => track.stop());
      if (options.audioChunksRef.current.length === 0) return;

      const recordedBlob = new Blob(options.audioChunksRef.current, {
        type: mimeType || 'audio/webm',
      });

      try {
        const formData = new FormData();
        formData.append('file', recordedBlob, 'speech.webm');

        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = (await response.json()) as { text?: string };
          if (data.text) {
            options.onTranscript(data.text);
          }
        }
      } catch (transcribeErr) {
        console.warn('Groq Whisper transcribe request failed:', transcribeErr);
      }
    };

    options.mediaRecorderRef.current = recorder;
    recorder.start();
    options.onListeningChange(true);
    return true;
  } catch (mediaErr) {
    console.warn('MediaRecorder setup failed, falling back to browser SpeechRecognition:', mediaErr);
    return false;
  }
}

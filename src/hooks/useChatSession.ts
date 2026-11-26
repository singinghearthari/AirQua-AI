import { useCallback, useEffect, useState } from 'react';
import {
  clearChatConversation,
  getChatConversation,
  saveChatConversation,
} from '@/lib/firebase/userStore';
import { ConsultantResponse } from '@/lib/gemini/schemas';
import {
  buildWelcomeMessage,
  getNextMessageId,
  loadCrossScreenContext,
  loadStoredChatMessages,
  MessageItem,
  STORAGE_CHAT_KEY,
} from '@/lib/storage/chatStorage';
import { mapTagToProvenanceKind } from '@/components/chat/ProvenanceBadge';
import {
  AirQualitySnapshot,
  HouseholdPersona,
  SafeWindowSummary,
  SupportedLanguage,
} from '@/types/airqua';

interface UseChatSessionParams {
  uid: string | undefined;
  cityName: string;
  persona: HouseholdPersona;
  language: SupportedLanguage;
  snapshot: AirQualitySnapshot | null;
  safeWindows: SafeWindowSummary | null;
  autoReadReplies: boolean;
  ttsSupported: boolean;
  speak: (text: string, lang?: SupportedLanguage) => void;
  stopSpeaking: () => void;
  onBotSpeakStart: (msgId: string | null) => void;
  onAfterSend?: () => void;
}

export function useChatSession(params: UseChatSessionParams) {
  const {
    uid,
    cityName,
    persona,
    language,
    snapshot,
    safeWindows,
    autoReadReplies,
    ttsSupported,
    speak,
    stopSpeaking,
    onBotSpeakStart,
    onAfterSend,
  } = params;

  const [crossScreen] = useState(loadCrossScreenContext);
  const [messages, setMessages] = useState<MessageItem[]>(() => {
    return loadStoredChatMessages() ?? [buildWelcomeMessage(cityName || 'your area', language, persona)];
  });
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let isCurrent = true;
    getChatConversation(uid).then((remoteHistory) => {
      if (isCurrent && remoteHistory && remoteHistory.length > 0) {
        setMessages(remoteHistory as MessageItem[]);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [uid]);

  useEffect(() => {
    if (messages.length <= 1) return;
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage quota errors
    }
    if (uid) {
      saveChatConversation(uid, messages).catch((err) =>
        console.warn('Failed to persist chat in Firestore:', err)
      );
    }
  }, [messages, uid]);

  const clearChat = useCallback(async () => {
    stopSpeaking();
    setMessages([buildWelcomeMessage(cityName || 'your area', language, persona)]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_CHAT_KEY);
    } catch {
      // Ignore storage errors
    }
    if (uid) await clearChatConversation(uid);
  }, [cityName, language, persona, stopSpeaking, uid]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const messageText = rawText.trim();
      if (!messageText || isSending) return false;
      if (messageText.length > 800) {
        setError('Message exceeds 800 characters limit.');
        return false;
      }

      stopSpeaking();
      onBotSpeakStart(null);
      const userMsg: MessageItem = {
        id: getNextMessageId('user'),
        role: 'user',
        text: messageText,
        timestamp: 'Sent',
      };
      setMessages((prev) => [...prev, userMsg]);
      setError(null);
      setLastFailedPrompt(null);
      setIsSending(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
            persona,
            language,
            snapshot,
            safeWindows,
            latestRoomScanSummary: crossScreen.roomScan?.summary,
            activeSimulatorSwaps: crossScreen.simulatorSwaps || undefined,
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          reply?: string;
          structured?: ConsultantResponse;
          provenance?: string;
          aiProvider?: 'gemini' | 'groq-backup';
        };

        if (!response.ok) throw new Error(data.error || 'Failed to receive response from assistant.');

        const structuredResp = data.structured;
        const botMsg: MessageItem = {
          id: getNextMessageId('bot'),
          role: 'model',
          text: data.reply || structuredResp?.answer || '',
          structured: structuredResp,
          provenance:
            data.provenance === 'Verified Fallback Guidance'
              ? 'FALLBACK'
              : structuredResp?.provenanceTags?.[0]
                ? mapTagToProvenanceKind(structuredResp.provenanceTags[0])
                : 'AI_GUIDANCE',
          aiProvider: data.aiProvider || 'gemini',
          timestamp: 'AI Guidance',
        };

        setMessages((prev) => [...prev, botMsg]);

        const spoken = structuredResp?.answer || data.reply;
        if (autoReadReplies && ttsSupported && spoken) {
          speak(spoken, language);
          onBotSpeakStart(botMsg.id);
        }
        return true;
      } catch (err: unknown) {
        console.error('Chat error:', err);
        setError(
          err instanceof Error ? err.message : 'Unable to connect to AI consultant. Please try again.'
        );
        setLastFailedPrompt(messageText);
        return false;
      } finally {
        setIsSending(false);
        onAfterSend?.();
      }
    },
    [
      isSending,
      stopSpeaking,
      onBotSpeakStart,
      messages,
      persona,
      language,
      snapshot,
      safeWindows,
      crossScreen,
      autoReadReplies,
      ttsSupported,
      speak,
      onAfterSend,
    ]
  );

  const markMessageSaved = useCallback((id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, saved: true } : m)));
  }, []);

  return {
    crossScreen,
    messages,
    isSending,
    error,
    setError,
    lastFailedPrompt,
    setLastFailedPrompt,
    clearChat,
    sendMessage,
    markMessageSaved,
  };
}

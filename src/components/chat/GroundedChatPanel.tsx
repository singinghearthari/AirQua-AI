'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  MapPin,
  Clock,
  ShieldAlert,
  BookmarkPlus,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Loader2,
  ChevronRight,
  ListTodo,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Camera,
  Gauge,
  Lightbulb,
  Zap,
  Repeat,
} from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { useAuth } from '@/context/AuthContext';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import {
  saveChatConversation,
  getChatConversation,
  clearChatConversation,
} from '@/lib/firebase/userStore';
import { ConsultantResponse, RecommendedAction } from '@/lib/gemini/schemas';
import ProvenanceBadge, { mapTagToProvenanceKind, ProvenanceKind } from './ProvenanceBadge';

export interface MessageItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  structured?: ConsultantResponse;
  provenance?: ProvenanceKind;
  aiProvider?: 'gemini' | 'groq-backup';
  timestamp: string;
  saved?: boolean;
}

const STORAGE_CHAT_KEY = 'airqua_chat_history_v2';
const STORAGE_AUTO_READ_KEY = 'airqua_auto_read_v2';

let messageIdSeq = 0;
function getNextMessageId(prefix: 'user' | 'bot'): string {
  messageIdSeq += 1;
  return `${prefix}-${Date.now()}-${messageIdSeq}`;
}

export default function GroundedChatPanel() {
  const {
    city,
    persona,
    scale,
    language,
    snapshot,
    safeWindows,
    savedActions,
    saveAction,
    removeAction,
    t,
  } = useAirqua();

  const { user } = useAuth();

  const [input, setInput] = useState('');

  const handleSpeechResult = useCallback((voiceText: string) => {
    if (voiceText.trim()) {
      setInput(voiceText.trim());
    }
  }, []);

  // Voice Assistant Hook
  const {
    isListening,
    transcript,
    sttSupported,
    startListening,
    stopListening,
    resetTranscript,
    isSpeaking,
    ttsSupported,
    speak,
    stopSpeaking,
  } = useVoiceAssistant(language, handleSpeechResult);

  // Auto-read voice responses toggle
  const [autoReadReplies, setAutoReadReplies] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_AUTO_READ_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);

  // Cross-screen contextual state (Room Scan & Simulator)
  const [roomScanContext] = useState<{
    sceneType: string;
    findingsCount: number;
    summary: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const roomScanStr = localStorage.getItem('airqua_last_room_scan_v2');
      return roomScanStr ? JSON.parse(roomScanStr) : null;
    } catch {
      return null;
    }
  });

  const [simulatorSwapsContext] = useState<string[] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const simSwapsStr = localStorage.getItem('airqua_simulator_swaps_v2');
      return simSwapsStr ? JSON.parse(simSwapsStr) : null;
    } catch {
      return null;
    }
  });

  // Track saved individual recommended actions
  const [savedActionTitles, setSavedActionTitles] = useState<Record<string, boolean>>({});

  // Messages State
  const [messages, setMessages] = useState<MessageItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_CHAT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }

    const cityName = city.name || 'your area';
    const initialText =
      language === 'ta'
        ? `வணக்கம்! நான் ஏர்குவா AI. ${cityName}-ன் நேரலை CPCB தரவுகளின் அடிப்படையில் இயங்கும் உங்கள் குடும்ப காற்றுத் தர ஆலோசகர். என்ன கேள்வி கேட்க விரும்புகிறீர்கள்?`
        : `Hello! I am AIRQUA AI, grounded in live Copernicus and CPCB telemetry for ${cityName} and tailored to your active profile (${persona}). Ask about safe errand timing, cooking ventilation, or commute adjustments.`;

    return [
      {
        id: 'initial-welcome',
        role: 'model',
        text: initialText,
        provenance: 'AI_GUIDANCE',
        timestamp: 'Verified Context',
      },
    ];
  });

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [showSavedPanel, setShowSavedPanel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore chat history from Firestore if logged in
  useEffect(() => {
    if (!user?.uid) return;
    let isCurrent = true;

    getChatConversation(user.uid).then((remoteHistory) => {
      if (!isCurrent || !remoteHistory || remoteHistory.length === 0) return;
      setMessages(remoteHistory);
    });

    return () => {
      isCurrent = false;
    };
  }, [user?.uid]);

  // Sync messages to Firestore or LocalStorage
  useEffect(() => {
    if (messages.length <= 1) return;

    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch {}

    if (user?.uid) {
      saveChatConversation(user.uid, messages).catch((err) =>
        console.warn('Failed to persist chat in Firestore:', err)
      );
    }
  }, [messages, user?.uid]);

  // Persist Auto-Read toggle setting
  const toggleAutoRead = () => {
    setAutoReadReplies((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_AUTO_READ_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Best safe window string formatting
  const bestWindowLabel = safeWindows?.bestOutdoorWindow
    ? `${new Date(safeWindows.bestOutdoorWindow.startISO).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}–${new Date(safeWindows.bestOutdoorWindow.endISO).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}`
    : '12:00–15:00';

  // Speech synthesis speaker toggle per message
  const handleToggleSpeak = (msg: MessageItem) => {
    if (isSpeaking && activeSpeakingMsgId === msg.id) {
      stopSpeaking();
      setActiveSpeakingMsgId(null);
    } else {
      const textToRead = msg.structured?.answer || msg.text;
      speak(textToRead, language);
      setActiveSpeakingMsgId(msg.id);
    }
  };

  // Clear chat conversation
  const handleClearChat = useCallback(async () => {
    stopSpeaking();
    const cityName = city.name || 'your area';
    const initialText =
      language === 'ta'
        ? `வணக்கம்! நான் ஏர்குவா AI. ${cityName}-ன் நேரலை CPCB தரவுகளின் அடிப்படையில் இயங்கும் உங்கள் குடும்ப காற்றுத் தர ஆலோசகர். என்ன கேள்வி கேட்க விரும்புகிறீர்கள்?`
        : `Hello! I am AIRQUA AI, grounded in live Copernicus and CPCB telemetry for ${cityName} and tailored to your active profile (${persona}). Ask about safe errand timing, cooking ventilation, or commute adjustments.`;

    const fresh: MessageItem[] = [
      {
        id: 'initial-welcome',
        role: 'model',
        text: initialText,
        provenance: 'AI_GUIDANCE',
        timestamp: 'Verified Context',
      },
    ];

    setMessages(fresh);
    setError(null);

    try {
      localStorage.removeItem(STORAGE_CHAT_KEY);
    } catch {}

    if (user?.uid) {
      await clearChatConversation(user.uid);
    }
  }, [city.name, language, persona, stopSpeaking, user]);

  // Handle message dispatch
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isSending) return;

    if (messageText.length > 800) {
      setError('Message exceeds 800 characters limit.');
      return;
    }

    // Stop ongoing speech
    stopSpeaking();
    setActiveSpeakingMsgId(null);

    const userMsg: MessageItem = {
      id: getNextMessageId('user'),
      role: 'user',
      text: messageText,
      timestamp: 'Sent',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLastFailedPrompt(null);
    setIsSending(true);

    // Prepare last 6 turns for context
    const recentHistory = messages.slice(-6).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: recentHistory,
          persona,
          language,
          snapshot,
          safeWindows,
          latestRoomScanSummary: roomScanContext?.summary,
          activeSimulatorSwaps: simulatorSwapsContext || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to receive response from assistant.');
      }

      const structuredResp: ConsultantResponse | undefined = data.structured;

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

      // Auto-read response if enabled
      if (autoReadReplies && ttsSupported) {
        const textToSpeak = structuredResp?.answer || data.reply;
        if (textToSpeak) {
          speak(textToSpeak, language);
          setActiveSpeakingMsgId(botMsg.id);
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Unable to connect to AI consultant. Please try again.');
      setLastFailedPrompt(messageText);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Save specific recommended action to routine checklist
  const handleSaveActionItem = (action: RecommendedAction) => {
    saveAction({
      headline: `[${city.name}] ${action.title}`,
      action: `${action.title} (${action.category} • ${action.effort === 'QUICK' ? 'Quick Fix' : 'Daily Habit'})`,
      period: action.category,
    });

    setSavedActionTitles((prev) => ({
      ...prev,
      [action.title]: true,
    }));
  };

  // Legacy full message action save
  const handleSaveFullMessageAction = (msg: MessageItem) => {
    const lines = msg.text.split('\n').filter((l) => l.trim().length > 0);
    const headline = lines[0]?.substring(0, 80) || 'Actionable Routine Tip';
    const detail = lines.slice(1).join(' ').substring(0, 300) || msg.text.substring(0, 200);

    saveAction({
      headline: `[${city.name}] ${headline}`,
      action: detail,
      period: 'TODAY',
    });

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, saved: true } : m))
    );
  };

  const quickPrompts = [
    t.consultant.quickPrompts[0] || 'What should I change today?',
    t.consultant.quickPrompts[1] || 'How do I reduce cooking smoke?',
    t.consultant.quickPrompts[2] || 'Why are you recommending this?',
    language === 'en' ? 'தமிழில் விளக்குங்கள்' : 'Explain in English',
  ];

  // Latest model message to show follow-up prompts
  const latestModelMessage = [...messages].reverse().find((m) => m.role === 'model');

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Live Context & Voice Controls Bar */}
      <div
        role="region"
        aria-label="Active Context Summary & Voice Controls"
        className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Active Context Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {/* City Chip */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-[12px] font-medium text-on-surface border border-outline-variant">
              <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{city.name}</span>
            </span>

            {/* Persona Chip */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-[12px] font-medium text-on-primary-container border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>{t.personas[persona] || persona}</span>
            </span>

            {/* Live AQI + Scale Chip */}
            {snapshot?.aqiValue !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[12px] font-mono font-bold text-on-surface border border-outline-variant">
                <span className="h-2 w-2 rounded-full bg-aqi-moderate" />
                <span>
                  {snapshot?.aqiValue ?? '—'} • {scale} ({snapshot?.aqiCategory || 'Moderate'})
                </span>
              </span>
            )}

            {/* Best Safe Window Chip */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-[12px] font-mono text-on-surface border border-outline-variant">
              <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Safe Window: {bestWindowLabel}</span>
            </span>

            {/* Cross-screen Room Scan Badge */}
            {roomScanContext && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 px-3 py-1 text-[11px] font-medium">
                <Camera className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>
                  Scan Context: {roomScanContext.sceneType} ({roomScanContext.findingsCount} findings)
                </span>
              </span>
            )}

            {/* Cross-screen Simulator Badge */}
            {simulatorSwapsContext && simulatorSwapsContext.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 px-3 py-1 text-[11px] font-medium">
                <Gauge className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>
                  Simulator: {simulatorSwapsContext.length} Routines Active
                </span>
              </span>
            )}

            {/* Groq Failover Status Pill */}
            {messages.some((m) => m.aiProvider === 'groq-backup') && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 px-3 py-1 text-[11px] font-medium animate-pulse">
                <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Failover Active: Groq Backup Engine</span>
              </span>
            )}
          </div>

          {/* Action Tools Cluster: Auto-Read Toggle, Saved Actions, Clear Chat */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Read Replies Voice Toggle */}
            <button
              type="button"
              onClick={toggleAutoRead}
              aria-pressed={autoReadReplies}
              aria-label={`Toggle auto-reading replies aloud: currently ${autoReadReplies ? 'ON' : 'OFF'}`}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-all border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
                autoReadReplies
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface hover:bg-surface-container border-outline-variant text-on-surface-variant'
              }`}
            >
              {autoReadReplies ? (
                <Volume2 className="h-3.5 w-3.5 text-on-primary animate-pulse" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
              )}
              <span>Auto-Read: {autoReadReplies ? 'ON' : 'OFF'}</span>
            </button>

            {/* Saved Actions Drawer Button */}
            <button
              type="button"
              onClick={() => setShowSavedPanel(!showSavedPanel)}
              aria-expanded={showSavedPanel}
              aria-label={`View saved routine checklist (${savedActions.length} items)`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container px-3 py-1.5 text-[12px] font-semibold text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              <ListTodo className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Saved ({savedActions.length})</span>
            </button>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={handleClearChat}
              aria-label="Clear chat conversation history"
              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 bg-surface hover:bg-error-container hover:text-on-error-container hover:border-error/40 px-2.5 py-1.5 text-[12px] font-medium text-on-surface-variant transition-colors focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Collapsible Saved Actions Panel */}
      {showSavedPanel && (
        <div
          role="region"
          aria-label="Saved Routine Checklist"
          className="rounded-xl border border-primary/40 bg-surface-container-low p-4 shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-[14px] text-on-surface flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>{t.consultant.savedPanelTitle || 'Saved Routine Actions'}</span>
            </h4>
            <span className="text-[11px] font-mono text-on-surface-variant">
              {user ? 'Synced with Cloud Firestore' : 'Persisted in Guest Mode (localStorage)'}
            </span>
          </div>

          {savedActions.length === 0 ? (
            <p className="text-[12px] text-on-surface-variant italic py-2">
              No saved actions yet. Click &ldquo;Save to Routine&rdquo; on any recommendation card below
              to build your daily protection checklist.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {savedActions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-2xs flex items-start justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-[13px] text-on-surface leading-tight">
                      {item.headline}
                    </span>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">
                      {item.action}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAction(item.id)}
                    aria-label={`Remove saved action ${item.headline}`}
                    className="p-1.5 text-on-surface-variant hover:text-error rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Quick Suggested Prompts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1">
          <HelpCircle className="h-3.5 w-3.5 text-outline" aria-hidden="true" />
          Suggested:
        </span>
        {quickPrompts.map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isSending}
            onClick={() => handleSendMessage(promptText)}
            aria-label={`Ask suggested question: ${promptText}`}
            className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest hover:border-primary/60 hover:bg-surface-container-low px-3 py-1 text-[12px] text-on-surface font-medium transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 cursor-pointer"
          >
            <span>{promptText}</span>
            <ChevronRight className="h-3 w-3 text-primary opacity-60" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* 4. Chat Thread Area */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation with Grounded AI Consultant"
        className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-6 shadow-xs flex flex-col gap-5 min-h-[420px] max-h-[620px] overflow-y-auto"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isMsgSpeaking = isSpeaking && activeSpeakingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 max-w-[90%] sm:max-w-[82%] ${
                isUser ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 px-1">
                {!isUser && (
                  <div className="h-5 w-5 rounded-full overflow-hidden border border-outline-variant/60 shadow-2xs shrink-0 bg-surface-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logo.jpeg"
                      alt="AIRQUA AI Avatar"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {!isUser && msg.provenance && (
                  <ProvenanceBadge kind={msg.provenance} />
                )}
                {!isUser && msg.aiProvider === 'groq-backup' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-medium">
                    <Zap className="h-3 w-3 text-amber-500" aria-hidden="true" />
                    Groq Backup
                  </span>
                )}
                <span className="text-[10px] font-mono text-on-surface-variant">
                  {msg.timestamp}
                </span>

                {/* Speaker Button on Model Responses */}
                {!isUser && ttsSupported && (
                  <button
                    type="button"
                    onClick={() => handleToggleSpeak(msg)}
                    aria-label={isMsgSpeaking ? 'Stop voice readout' : 'Listen to this response'}
                    title={isMsgSpeaking ? 'Stop speaking' : 'Listen with voice assistance'}
                    className={`p-1 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
                      isMsgSpeaking
                        ? 'bg-primary text-on-primary animate-pulse'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                    }`}
                  >
                    {isMsgSpeaking ? (
                      <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>

              {/* Message Bubble Content */}
              <div
                className={`p-4 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed flex flex-col gap-3 ${
                  isUser
                    ? 'bg-primary text-on-primary rounded-br-xs shadow-xs'
                    : 'bg-surface-container-low border border-outline-variant/60 text-on-surface rounded-bl-xs shadow-2xs'
                }`}
              >
                {/* 1. Direct Answer */}
                <div className="whitespace-pre-wrap font-normal leading-relaxed">
                  {msg.structured ? msg.structured.answer : msg.text}
                </div>

                {/* 2. Structured "Why It Matters" Callout (if available) */}
                {!isUser && msg.structured?.whyItMatters && (
                  <div className="rounded-xl border border-primary/25 bg-surface-container p-3 flex flex-col gap-1 shadow-2xs">
                    <span className="font-semibold text-primary text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <span>Scientific Why It Matters</span>
                    </span>
                    <p className="text-[12px] text-on-surface leading-relaxed">
                      {msg.structured.whyItMatters}
                    </p>
                  </div>
                )}

                {/* 3. Structured Recommended Actions (if available) */}
                {!isUser &&
                  msg.structured?.recommendedActions &&
                  msg.structured.recommendedActions.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1 border-t border-outline-variant/50">
                      <span className="text-[11px] font-mono font-semibold text-on-surface-variant uppercase tracking-wider">
                        Recommended Actions for {persona}:
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.structured.recommendedActions.map((action, actIdx) => {
                          const isActionSaved = savedActionTitles[action.title];

                          return (
                            <div
                              key={actIdx}
                              className="rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-[12px] text-on-surface">
                                  {action.title}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                                      action.category === 'EXPOSURE'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                        : action.category === 'EMISSIONS'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    }`}
                                  >
                                    {action.category}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-container text-on-surface-variant flex items-center gap-1">
                                    {action.effort === 'QUICK' ? (
                                      <>
                                        <Zap className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                                        <span>Quick Fix</span>
                                      </>
                                    ) : (
                                      <>
                                        <Repeat className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                                        <span>Daily Habit</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSaveActionItem(action)}
                                disabled={isActionSaved}
                                aria-label={`Save action: ${action.title}`}
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0 cursor-pointer ${
                                  isActionSaved
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                                }`}
                              >
                                {isActionSaved ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                    <span>Saved</span>
                                  </>
                                ) : (
                                  <>
                                    <BookmarkPlus className="h-3 w-3 text-primary" aria-hidden="true" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* 4. Legacy Save Entire Message Action Button (if no structured actions) */}
                {!isUser && !msg.structured?.recommendedActions && (
                  <div className="mt-1 pt-2 border-t border-outline-variant/60 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Grounded in Live Telemetry
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSaveFullMessageAction(msg)}
                      disabled={msg.saved}
                      aria-label="Save this advice to your routine checklist"
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer ${
                        msg.saved
                          ? 'bg-aqi-good/20 text-aqi-good border border-aqi-good/30'
                          : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                      }`}
                    >
                      {msg.saved ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-aqi-good" aria-hidden="true" />
                          <span>{t.consultant.savedAction || 'Saved to Routine'}</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-3 w-3 text-primary" aria-hidden="true" />
                          <span>{t.consultant.saveAction || 'Save Action'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* 5. Clickable Follow-up Prompts for the Latest Model Message */}
              {!isUser &&
                latestModelMessage?.id === msg.id &&
                msg.structured?.followUpPrompts &&
                msg.structured.followUpPrompts.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 pl-2">
                    <span className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1 font-semibold">
                      <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                      Suggested Follow-Ups:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.structured.followUpPrompts.map((promptText, fIdx) => (
                        <button
                          key={fIdx}
                          type="button"
                          disabled={isSending}
                          onClick={() => handleSendMessage(promptText)}
                          aria-label={`Follow-up question: ${promptText}`}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-container/20 hover:bg-primary-container/40 text-on-surface px-3 py-1 text-[12px] font-medium transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
                        >
                          <span>{promptText}</span>
                          <ChevronRight className="h-3 w-3 text-primary" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          );
        })}

        {/* Live Typing / Loading State */}
        {isSending && (
          <div className="self-start flex flex-col gap-1 max-w-sm">
            <div className="flex items-center gap-2 px-1">
              <div className="h-5 w-5 rounded-full overflow-hidden border border-outline-variant/60 shadow-2xs shrink-0 bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.jpeg"
                  alt="AIRQUA AI Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-[10px] font-mono text-primary font-medium animate-pulse">
                Consulting verified telemetry...
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-on-surface-variant flex items-center gap-2.5 text-[13px] shadow-2xs">
              <div className="flex items-center gap-1 px-1">
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
              </div>
              <span className="text-[12px] font-medium text-on-surface-variant">
                Synthesizing verified telemetry &amp; safe windows for {persona}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Error Banner with Retry */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/40 bg-error-container/90 backdrop-blur-xs p-3.5 text-on-error-container text-[12px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-error shrink-0" aria-hidden="true" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {lastFailedPrompt && (
              <button
                type="button"
                onClick={() => {
                  const retryText = lastFailedPrompt;
                  setLastFailedPrompt(null);
                  setError(null);
                  handleSendMessage(retryText);
                }}
                className="px-2.5 py-1 rounded-md bg-error text-on-error font-semibold text-[11px] hover:bg-error/90 transition-colors cursor-pointer"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => setError(null)}
              className="px-2 py-1 rounded-md text-[11px] underline font-medium hover:text-on-error-container cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 6. Live Speech-to-Text Interim Preview Bar */}
      {isListening && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-primary/40 bg-primary-container/30 px-4 py-2.5 text-[13px] text-on-surface flex items-center justify-between animate-pulse"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-error animate-ping" />
            <span className="font-semibold text-primary">
              Listening ({language === 'ta' ? 'தமிழ்' : 'English'})...
            </span>
            <span className="italic text-on-surface-variant">
              {transcript || 'Speak your question now...'}
            </span>
          </div>
          <button
            type="button"
            onClick={stopListening}
            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* 7. Chat Input Area with Accessible Microphone Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-xs"
      >
        <div className="flex items-center gap-2">
          {/* Microphone Speech-To-Text Button */}
          <button
            type="button"
            onClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            disabled={!sttSupported || isSending}
            aria-pressed={isListening}
            aria-label={
              !sttSupported
                ? 'Speech recognition not supported in this browser'
                : isListening
                  ? 'Stop listening'
                  : `Start voice input in ${language === 'ta' ? 'Tamil' : 'English'}`
            }
            title={
              !sttSupported
                ? 'Speech recognition not supported in this browser'
                : isListening
                  ? 'Stop listening'
                  : `Click to speak in ${language === 'ta' ? 'Tamil (தமிழ்)' : 'English'}`
            }
            className={`p-2.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isListening
                ? 'bg-error text-on-error animate-pulse shadow-md ring-2 ring-error/50'
                : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-primary'
            }`}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Mic className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            maxLength={800}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            placeholder={
              isListening
                ? language === 'ta'
                  ? 'நீங்கள் பேசுவது கேட்கிறது...'
                  : 'Listening... speak your question...'
                : t.consultant.inputPlaceholder ||
                  "Ask about today's air quality, cooking smoke, or commute..."
            }
            aria-label="Message input for AI Consultant"
            className="flex-1 bg-transparent px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-variant/60 border-none outline-none focus:ring-0"
          />

          <button
            type="submit"
            disabled={!input.trim() || isSending}
            aria-label={isSending ? t.consultant.sending : t.consultant.send}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 text-[13px] font-semibold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {isSending ? t.consultant.sending : t.consultant.send}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between px-2 pt-1 border-t border-outline-variant/40 text-[11px] font-mono text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Mic className="h-3 w-3 text-primary" aria-hidden="true" />
            <span>Voice input: {language === 'ta' ? 'தமிழ் (Tamil)' : 'English (India)'}</span>
          </span>
          <span>{input.length}/800</span>
        </div>
      </form>

      {/* 8. Mandatory Medical & Sensor Boundary Notice */}
      <div
        role="note"
        aria-label="Medical and Sensor Disclaimer"
        className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3 text-[11px] text-on-surface-variant flex items-start gap-2 leading-relaxed"
      >
        <ShieldAlert className="h-4 w-4 text-outline shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong className="text-on-surface font-semibold">Scientific & Health Boundary: </strong>
          {t.consultant.medicalDisclaimer ||
            'AIRQUA AI provides educational guidance based on open meteorological models and official CPCB breakpoints. Not certified medical advice or a substitute for calibrated indoor sensors.'}
        </div>
      </div>
    </div>
  );
}

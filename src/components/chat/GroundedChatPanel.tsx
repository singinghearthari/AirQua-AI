'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, HelpCircle, ShieldAlert } from 'lucide-react';
import { useAirqua } from '@/context/AirquaContext';
import { useAuth } from '@/context/AuthContext';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useChatSession } from '@/hooks/useChatSession';
import { RecommendedAction } from '@/lib/gemini/schemas';
import {
  buildQuickPrompts,
  formatBestWindowLabel,
  loadAutoReadPreference,
  MessageItem,
  STORAGE_AUTO_READ_KEY,
} from '@/lib/storage/chatStorage';
import ChatContextBar from './ChatContextBar';
import ChatSavedPanel from './ChatSavedPanel';
import ChatMessageBubble from './ChatMessageBubble';
import ChatInputForm from './ChatInputForm';
import ChatStatusBanners, { ChatTypingIndicator } from './ChatStatusBanners';

export type { MessageItem } from '@/lib/storage/chatStorage';

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
    if (voiceText.trim()) setInput(voiceText.trim());
  }, []);

  const voice = useVoiceAssistant(language, handleSpeechResult);
  const [autoReadReplies, setAutoReadReplies] = useState<boolean>(loadAutoReadPreference);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);
  const [savedActionTitles, setSavedActionTitles] = useState<Record<string, boolean>>({});
  const [showSavedPanel, setShowSavedPanel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chat = useChatSession({
    uid: user?.uid,
    cityName: city.name,
    persona,
    language,
    snapshot,
    safeWindows,
    autoReadReplies,
    ttsSupported: voice.ttsSupported,
    speak: voice.speak,
    stopSpeaking: voice.stopSpeaking,
    onBotSpeakStart: setActiveSpeakingMsgId,
    onAfterSend: () => inputRef.current?.focus(),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages, chat.isSending]);

  const toggleAutoRead = () => {
    setAutoReadReplies((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_AUTO_READ_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const bestWindowLabel = formatBestWindowLabel(safeWindows);

  const handleToggleSpeak = (msg: MessageItem) => {
    if (voice.isSpeaking && activeSpeakingMsgId === msg.id) {
      voice.stopSpeaking();
      setActiveSpeakingMsgId(null);
    } else {
      voice.speak(msg.structured?.answer || msg.text, language);
      setActiveSpeakingMsgId(msg.id);
    }
  };

  const dispatchMessage = async (textToSend?: string) => {
    const target = (textToSend ?? input).trim();
    if (!target) return;
    if (!textToSend) setInput('');
    await chat.sendMessage(target);
  };

  const handleSaveActionItem = (action: RecommendedAction) => {
    saveAction({
      headline: `[${city.name}] ${action.title}`,
      action: `${action.title} (${action.category} • ${action.effort === 'QUICK' ? 'Quick Fix' : 'Daily Habit'})`,
      period: action.category,
    });
    setSavedActionTitles((prev) => ({ ...prev, [action.title]: true }));
  };

  const handleSaveFullMessageAction = (msg: MessageItem) => {
    const lines = msg.text.split('\n').filter((l) => l.trim().length > 0);
    saveAction({
      headline: `[${city.name}] ${lines[0]?.substring(0, 80) || 'Actionable Routine Tip'}`,
      action: lines.slice(1).join(' ').substring(0, 300) || msg.text.substring(0, 200),
      period: 'TODAY',
    });
    chat.markMessageSaved(msg.id);
  };

  const quickPrompts = buildQuickPrompts(t.consultant.quickPrompts, language);
  const latestModelMessage = [...chat.messages].reverse().find((m) => m.role === 'model');

  return (
    <div className="flex flex-col gap-4 w-full">
      <ChatContextBar
        city={city}
        persona={persona}
        personaLabel={t.personas[persona] || persona}
        scale={scale}
        snapshot={snapshot}
        bestWindowLabel={bestWindowLabel}
        roomScanContext={chat.crossScreen.roomScan}
        simulatorSwapsContext={chat.crossScreen.simulatorSwaps}
        messages={chat.messages}
        autoReadReplies={autoReadReplies}
        onToggleAutoRead={toggleAutoRead}
        showSavedPanel={showSavedPanel}
        onToggleSavedPanel={() => setShowSavedPanel((prev) => !prev)}
        savedCount={savedActions.length}
        onClearChat={chat.clearChat}
      />

      {showSavedPanel && (
        <ChatSavedPanel
          title={t.consultant.savedPanelTitle}
          isSignedIn={Boolean(user)}
          savedActions={savedActions}
          onRemoveAction={removeAction}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1">
          <HelpCircle className="h-3.5 w-3.5 text-outline" aria-hidden="true" />
          Suggested:
        </span>
        {quickPrompts.map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            disabled={chat.isSending}
            onClick={() => dispatchMessage(promptText)}
            aria-label={`Ask suggested question: ${promptText}`}
            className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest hover:border-primary/60 hover:bg-surface-container-low px-3 py-1 text-[12px] text-on-surface font-medium transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 cursor-pointer"
          >
            <span>{promptText}</span>
            <ChevronRight className="h-3 w-3 text-primary opacity-60" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation with Grounded AI Consultant"
        className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-6 shadow-xs flex flex-col gap-5 min-h-[420px] max-h-[620px] overflow-y-auto"
      >
        {chat.messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            msg={msg}
            persona={persona}
            isLatestModelMessage={latestModelMessage?.id === msg.id}
            isSpeaking={voice.isSpeaking}
            activeSpeakingMsgId={activeSpeakingMsgId}
            ttsSupported={voice.ttsSupported}
            isSending={chat.isSending}
            savedActionTitles={savedActionTitles}
            saveActionLabel={t.consultant.saveAction}
            savedActionLabel={t.consultant.savedAction}
            onToggleSpeak={handleToggleSpeak}
            onSaveActionItem={handleSaveActionItem}
            onSaveFullMessageAction={handleSaveFullMessageAction}
            onSendFollowUp={(prompt) => dispatchMessage(prompt)}
          />
        ))}
        {chat.isSending && <ChatTypingIndicator persona={persona} />}
        <div ref={messagesEndRef} />
      </div>

      <ChatStatusBanners
        error={chat.error}
        lastFailedPrompt={chat.lastFailedPrompt}
        onRetryPrompt={(prompt) => {
          chat.setLastFailedPrompt(null);
          chat.setError(null);
          dispatchMessage(prompt);
        }}
        onDismissError={() => chat.setError(null)}
        isListening={voice.isListening}
        language={language}
        transcript={voice.transcript}
        onStopListening={voice.stopListening}
      />

      <ChatInputForm
        input={input}
        onChangeInput={setInput}
        onSubmit={() => dispatchMessage()}
        isSending={chat.isSending}
        isListening={voice.isListening}
        sttSupported={voice.sttSupported}
        onStartListening={voice.startListening}
        onStopListening={voice.stopListening}
        language={language}
        placeholder={t.consultant.inputPlaceholder || "Ask about today's air quality, cooking smoke, or commute..."}
        sendLabel={t.consultant.send}
        sendingLabel={t.consultant.sending}
        inputRef={inputRef}
      />

      <div
        role="note"
        aria-label="Medical and Sensor Disclaimer"
        className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-3 text-[11px] text-on-surface-variant flex items-start gap-2 leading-relaxed"
      >
        <ShieldAlert className="h-4 w-4 text-outline shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong className="text-on-surface font-semibold">Scientific &amp; Health Boundary: </strong>
          {t.consultant.medicalDisclaimer}
        </div>
      </div>
    </div>
  );
}

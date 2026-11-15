import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Flag, MessageSquare, Send, Volume2, VolumeX } from 'lucide-react';
import { RoomChatMessage } from '../types';
import { mpClient } from '../net/multiplayerClient';

interface ChatOverlayProps {
  messages: RoomChatMessage[];
  mutedPlayerIds: Set<string>;
  chatOpen: boolean;
  focusTrigger: number;
  onToggleOpen: () => void;
  onToggleMutePlayer: (playerId: string, playerName: string) => void;
  onReportPlayer: (playerId: string, playerName: string) => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  messages,
  mutedPlayerIds,
  chatOpen,
  focusTrigger,
  onToggleOpen,
  onToggleMutePlayer,
  onReportPlayer,
}) => {
  const [draft, setDraft] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevLenRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      if (!chatOpen) {
        setUnreadCount((c) => c + (messages.length - prevLenRef.current));
      }
    }
    prevLenRef.current = messages.length;
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, chatOpen]);

  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
    }
  }, [chatOpen]);

  useEffect(() => {
    if (focusTrigger > 0 && chatOpen) {
      inputRef.current?.focus();
    }
  }, [focusTrigger, chatOpen]);

  const visibleMessages = messages.filter(
    (m) => m.system || !mutedPlayerIds.has(m.senderId),
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) return;
    mpClient.sendChat(clean);
    setDraft('');
  };

  return (
    <div className="pointer-events-auto w-80 max-w-[85vw] bg-[#0B0E15]/92 border border-white/12 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full px-3.5 py-2 bg-[#101420] border-b border-white/10 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#151B2B]"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          Kamerchat [T]
          {unreadCount > 0 && !chatOpen && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px]">
              {unreadCount}
            </span>
          )}
        </span>
        {chatOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>

      {chatOpen && (
        <>
          <div
            ref={listRef}
            className="h-44 overflow-y-auto px-3 py-2 space-y-1.5 text-xs"
          >
            {visibleMessages.length === 0 ? (
              <div className="text-slate-500 text-[11px] py-4 text-center">
                Nog geen berichten. Druk [T] of typ hieronder.
              </div>
            ) : (
              visibleMessages.slice(-40).map((m) => {
                const isSelf = m.senderId === mpClient.playerId;
                const isMuted = mutedPlayerIds.has(m.senderId);
                return (
                  <div key={m.id} className="group flex items-start justify-between gap-2 leading-snug">
                    <div className="min-w-0 break-words">
                      {m.system ? (
                        <span className="text-amber-300/90 italic">{m.text}</span>
                      ) : (
                        <>
                          <span className={`font-bold ${isSelf ? 'text-amber-400' : 'text-sky-300'}`}>
                            {m.senderName}:{' '}
                          </span>
                          <span className="text-slate-200">{m.text}</span>
                        </>
                      )}
                    </div>
                    {!m.system && !isSelf && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onToggleMutePlayer(m.senderId, m.senderName)}
                          title={isMuted ? 'Dempen opheffen' : 'Lokaal dempen'}
                          className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                        >
                          {isMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onReportPlayer(m.senderId, m.senderName)}
                          title="Melden bij host"
                          className="p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-300"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} className="p-2 border-t border-white/10 flex items-center gap-1.5 bg-[#090C12]">
            <input
              ref={inputRef}
              type="text"
              maxLength={240}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.code === 'Escape') {
                  inputRef.current?.blur();
                }
              }}
              placeholder="Typ bericht..."
              className="flex-1 bg-[#141925] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950"
              title="Verstuur"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

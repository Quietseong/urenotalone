"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CharacterPlaceholder,
  type CharacterVariant,
} from "@/components/CharacterPlaceholder";
import {
  loadMemory,
  resetMemory,
  saveMemory,
  type Memory,
  type SessionSummary,
} from "@/lib/memory";
import { getReply } from "@/lib/chat-client";
import { vocative } from "@/lib/korean";
import {
  cancel as ttsCancel,
  isSupported as ttsIsSupported,
  primeVoices,
  speak as ttsSpeak,
  subscribe as ttsSubscribe,
} from "@/lib/tts";
import {
  isSupported as sttIsSupported,
  start as sttStart,
  type SttHandle,
} from "@/lib/stt";

type Role = "character" | "user";
type Message = {
  id: string;
  role: Role;
  text: string;
};

const EMOTION_TO_VARIANT: Record<string, CharacterVariant> = {
  neutral: "listening",
  listening: "listening",
  happy: "happy",
  concerned: "sad",
};

const EMOTION_TO_KOREAN: Record<string, string> = {
  neutral: "중립",
  listening: "중립",
  happy: "긍정",
  concerned: "걱정",
};

export default function ChatPage() {
  const router = useRouter();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [crisisNotice, setCrisisNotice] = useState(false);
  const [characterMood, setCharacterMood] =
    useState<CharacterVariant>("listening");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [ttsOn, setTtsOn] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crisisTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sttHandle = useRef<SttHandle | null>(null);
  const settledMoodRef = useRef<CharacterVariant>("listening");

  useEffect(() => {
    const mem = loadMemory();
    if (!mem.character_name || !mem.user_name) {
      router.replace("/");
      return;
    }
    setMemory(mem);
    setTtsOn(mem.tts_enabled !== false);
    setTtsSupported(ttsIsSupported());
    setSttSupported(sttIsSupported());
    primeVoices();
    setSessionId(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const greet = `${vocative(mem.user_name)} 안녕! 오늘은 어떤 하루였어?`;
    setMessages([{ id: "greet", role: "character", text: greet }]);
    if (mem.tts_enabled !== false && ttsIsSupported()) {
      setTimeout(() => ttsSpeak(greet), 250);
    }
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (moodTimer.current) clearTimeout(moodTimer.current);
      if (crisisTimer.current) clearTimeout(crisisTimer.current);
      ttsCancel();
      sttHandle.current?.abort();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = ttsSubscribe((status) => {
      if (status === "speaking") {
        if (moodTimer.current) clearTimeout(moodTimer.current);
        setCharacterMood("speaking");
      } else if (status === "idle") {
        setCharacterMood(settledMoodRef.current);
      }
    });
    return unsubscribe;
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !memory || sessionEnded || pending) return;

    const stamp = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u-${stamp}`, role: "user", text: trimmed },
    ]);
    setDraft("");
    setCharacterMood("speaking");
    if (moodTimer.current) clearTimeout(moodTimer.current);
    setPending(true);

    let reply;
    try {
      reply = await getReply({
        session_id: sessionId,
        user_input: trimmed,
        memory,
        turn_index: turnCount,
      });
    } finally {
      setPending(false);
    }

    setMessages((prev) => [
      ...prev,
      { id: `c-${stamp + 1}`, role: "character", text: reply.character_response },
    ]);
    setTurnCount((c) => c + 1);
    if (ttsOn && ttsSupported) {
      ttsSpeak(reply.character_response);
    }

    let nextMemory: Memory = memory;
    if (Object.keys(reply.memory_updates).length > 0) {
      nextMemory = saveMemory(reply.memory_updates);
    }

    if (reply.should_end_session && reply.session_summary) {
      const summary: SessionSummary = {
        day: nextMemory.day || 1,
        date: new Date().toISOString().slice(0, 10),
        summary: reply.session_summary,
        last_emotion: EMOTION_TO_KOREAN[reply.emotion_hint] ?? "중립",
      };
      const recent = [...nextMemory.recent_sessions, summary].slice(-3);
      nextMemory = saveMemory({
        recent_sessions: recent,
        last_session_at: new Date().toISOString(),
      });
    }
    setMemory(nextMemory);

    if (reply.crisis_hit) {
      setCrisisNotice(true);
    }

    const settledMood =
      EMOTION_TO_VARIANT[reply.emotion_hint] ?? "listening";
    settledMoodRef.current = settledMood;
    if (reply.should_end_session) {
      setSessionEnded(true);
    }
    if (!(ttsOn && ttsSupported)) {
      moodTimer.current = setTimeout(() => setCharacterMood(settledMood), 1800);
    }
  }

  function handleReset() {
    if (!confirm("대화 메모리를 초기화하고 처음으로 돌아갈까요?")) return;
    ttsCancel();
    resetMemory();
    router.replace("/");
  }

  function handleToggleTts() {
    const next = !ttsOn;
    setTtsOn(next);
    saveMemory({ tts_enabled: next });
    if (!next) ttsCancel();
  }

  function handleToggleMic() {
    if (sessionEnded || pending) return;
    if (recording) {
      sttHandle.current?.stop();
      return;
    }
    ttsCancel();
    setSttError(null);
    const handle = sttStart({
      onStart: () => setRecording(true),
      onInterim: (text) => setDraft(text),
      onFinal: (text) => setDraft(text),
      onError: (code) => {
        setSttError(
          code === "no-speech"
            ? "음성이 들리지 않았어요"
            : code === "not-allowed"
              ? "마이크 권한이 필요해요"
              : "음성 인식 오류, 다시 시도해 주세요",
        );
      },
      onEnd: () => {
        setRecording(false);
        sttHandle.current = null;
      },
    });
    sttHandle.current = handle;
  }

  if (!memory) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="size-12 animate-pulse rounded-full bg-primary-soft" />
      </main>
    );
  }

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main className="flex flex-1 flex-col h-screen max-h-screen">
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            🌱
          </span>
          <span className="text-sm font-medium text-ink">
            {memory.day || 1}일째 {memory.character_name}와 친구!
          </span>
        </div>
        <div className="flex items-center gap-2">
          {crisisNotice && (
            <Link
              href="/parent"
              className="text-xs px-2 py-1 rounded-full bg-crisis text-white hover:bg-crisis/90 transition-colors"
              aria-live="polite"
              title="보호자 메일함 열기"
            >
              📧 보호자 알림 · 메일함 보기
            </Link>
          )}
          {ttsSupported && (
            <button
              type="button"
              onClick={handleToggleTts}
              aria-pressed={ttsOn}
              aria-label={ttsOn ? "음성 끄기" : "음성 켜기"}
              title={ttsOn ? "음성 끄기" : "음성 켜기"}
              className="text-base px-2 py-1 rounded-full hover:bg-primary-soft text-ink"
            >
              {ttsOn ? "🔊" : "🔇"}
            </button>
          )}
          {isDev && (
            <>
              <Link
                href="/parent"
                className="text-xs text-ink-muted hover:text-ink underline-offset-2 hover:underline"
                title="dev: 보호자 메일함 보기"
              >
                📧 메일함
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-ink-muted hover:text-ink underline-offset-2 hover:underline"
              >
                reset
              </button>
            </>
          )}
        </div>
      </header>

      <section className="flex justify-center bg-bg py-4 border-b border-border">
        <CharacterPlaceholder variant={characterMood} size={140} priority />
      </section>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-bg"
      >
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} text={m.text} />
        ))}
        {pending && <TypingIndicator />}
      </div>

      {sessionEnded && (
        <div className="px-4 py-2 text-center text-xs text-ink-muted bg-primary-soft border-t border-border">
          오늘 대화는 여기까지~ 내일 또 만나자!
        </div>
      )}
      {sttError && !sessionEnded && (
        <div
          className="px-4 py-2 text-center text-xs text-crisis bg-white border-t border-border"
          aria-live="polite"
        >
          {sttError}
        </div>
      )}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 px-4 py-3 border-t border-border bg-surface"
      >
        {sttSupported && (
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={sessionEnded || pending}
            aria-pressed={recording}
            aria-label={recording ? "녹음 중지" : "음성 입력 시작"}
            title={recording ? "녹음 중지" : "음성 입력"}
            className={`shrink-0 size-11 rounded-full text-lg shadow-sm border transition-colors ${
              recording
                ? "bg-crisis text-white border-crisis animate-pulse"
                : "bg-white border-border text-ink hover:bg-primary-soft"
            } disabled:bg-primary-soft disabled:text-ink-soft disabled:cursor-not-allowed`}
          >
            {recording ? "●" : "🎤"}
          </button>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          placeholder={
            sessionEnded
              ? "오늘 대화는 끝났어"
              : recording
                ? "듣고 있어..."
                : "메시지를 입력하세요"
          }
          disabled={sessionEnded || pending}
          className="flex-1 resize-none rounded-card border border-border bg-white px-4 py-2.5 text-base text-ink placeholder:text-ink-soft focus:outline-none focus:border-primary-strong disabled:bg-primary-soft disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sessionEnded || pending || recording}
          className="rounded-button bg-primary-strong px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-stronger disabled:bg-primary-soft disabled:text-ink-soft"
        >
          보내기
        </button>
        {isDev && (
          <>
            <button
              type="button"
              onClick={() => setCrisisNotice((v) => !v)}
              className="text-xs text-ink-muted hover:text-ink"
              title="dev: toggle crisis indicator"
            >
              ⚠
            </button>
            <button
              type="button"
              onClick={() =>
                setCharacterMood((m) =>
                  m === "happy" ? "sad" : m === "sad" ? "listening" : "happy",
                )
              }
              className="text-xs text-ink-muted hover:text-ink"
              title="dev: cycle character mood (happy → sad → listening)"
            >
              🎭
            </button>
          </>
        )}
      </form>
    </main>
  );
}

function Bubble({ role, text }: { role: Role; text: string }) {
  const isUser = role === "user";
  return (
    <div
      className={`flex anim-fade-in ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-bubble px-4 py-2.5 text-base leading-relaxed shadow-sm ${
          isUser
            ? "bg-bubble-user text-ink"
            : "bg-bubble-char border border-border text-ink"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      className="flex justify-start anim-fade-in"
      aria-live="polite"
      aria-label="도리가 생각 중이에요"
    >
      <div className="rounded-bubble bg-bubble-char border border-border px-4 py-3 shadow-sm flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full bg-ink-soft anim-typing-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="size-1.5 rounded-full bg-ink-soft anim-typing-dot"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="size-1.5 rounded-full bg-ink-soft anim-typing-dot"
          style={{ animationDelay: "320ms" }}
        />
      </div>
    </div>
  );
}

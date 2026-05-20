"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadMemory, saveMemory, type CrisisLog } from "@/lib/memory";

type EmailItem = {
  log: CrisisLog;
  index: number;
};

const CATEGORY_TONE: Record<string, { label: string; badge: string }> = {
  따돌림: { label: "또래 관계 신호", badge: "bg-amber-100 text-amber-900" },
  언어폭력: { label: "언어 폭력 신호", badge: "bg-amber-100 text-amber-900" },
  자해: { label: "긴급 — 자해 신호", badge: "bg-red-100 text-red-900" },
  학대: { label: "긴급 — 학대 신호", badge: "bg-red-100 text-red-900" },
};

const CATEGORY_BLURB: Record<string, string> = {
  따돌림:
    "아이의 또래 관계에서 외로움이나 배제 신호가 감지되었어요. 다그치지 말고 가볍게 하루를 물어봐 주세요.",
  언어폭력:
    "또래로부터 거친 말을 들었거나 자신이 사용한 표현이 감지되었어요. 안전한 분위기에서 한 번 들어 주세요.",
  자해: "자해와 관련된 표현이 감지되었어요. 가능한 빨리 아이와 마주 앉아 대화를 시도해 주세요.",
  학대: "신체적·정서적 학대로 의심되는 표현이 감지되었어요. 보호자 외 어른(담임/상담사) 연계가 필요할 수 있어요.",
};

export default function ParentInboxPage() {
  const [items, setItems] = useState<EmailItem[] | null>(null);
  const [userName, setUserName] = useState("아이");
  const [characterName, setCharacterName] = useState("도리");

  useEffect(() => {
    const mem = loadMemory();
    setUserName(mem.user_name || "아이");
    setCharacterName(mem.character_name || "도리");
    const list: EmailItem[] = mem.crisis_keyword_hits.map((log, index) => ({
      log,
      index,
    }));
    setItems(list.reverse());

    if (mem.crisis_keyword_hits.some((h) => !h.email_sent)) {
      saveMemory({
        crisis_keyword_hits: mem.crisis_keyword_hits.map((h) => ({
          ...h,
          email_sent: true,
        })),
      });
    }
  }, []);

  const newCount = useMemo(
    () => items?.filter((i) => !i.log.email_sent).length ?? 0,
    [items],
  );

  if (!items) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="size-12 animate-pulse rounded-full bg-primary-soft" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col min-h-screen bg-bg">
      <header className="px-5 py-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-ink-muted">보호자 알림함 (mock)</div>
            <h1 className="text-lg font-semibold text-ink">
              {characterName} → {userName} 보호자
            </h1>
          </div>
          <Link
            href="/chat"
            className="text-xs text-ink-muted hover:text-ink underline-offset-2 hover:underline"
          >
            ← 대화로 돌아가기
          </Link>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          이 페이지는 PoC 시연용 가상 메일함입니다. 실제 이메일은 발송되지
          않으며, 위기 키워드 감지 로그를 보호자 입장에서 보여주는 시각화입니다.
        </p>
      </header>

      <section className="flex-1 px-4 py-5 flex flex-col gap-3 max-w-2xl w-full mx-auto">
        {items.length === 0 ? (
          <div className="rounded-card border border-border bg-white px-5 py-10 text-center text-ink-muted">
            <div className="text-3xl mb-2" aria-hidden>
              📭
            </div>
            아직 보호자에게 전달된 알림이 없어요.
            <div className="mt-1 text-xs">
              아이가 위기 키워드를 표현하면 이 곳에 알림이 도착합니다.
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-ink-muted">
              총 {items.length}건 · 신규 {newCount}건
            </div>
            {items.map(({ log, index }) => (
              <EmailCard
                key={`${log.session_id}-${index}`}
                log={log}
                userName={userName}
                characterName={characterName}
              />
            ))}
          </>
        )}
      </section>
    </main>
  );
}

function EmailCard({
  log,
  userName,
  characterName,
}: {
  log: CrisisLog;
  userName: string;
  characterName: string;
}) {
  const tone = CATEGORY_TONE[log.category] ?? {
    label: log.category,
    badge: "bg-amber-100 text-amber-900",
  };
  const blurb = CATEGORY_BLURB[log.category] ?? "";
  return (
    <article className="rounded-card border border-border bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${tone.badge}`}
        >
          {tone.label}
        </span>
        <span className="text-xs text-ink-muted">{log.day}일째</span>
      </div>
      <h2 className="text-sm font-semibold text-ink mb-1">
        {userName}의 대화에서 신호가 감지되었습니다
      </h2>
      <p className="text-sm text-ink leading-relaxed">{blurb}</p>
      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs text-ink-muted">
        <dt>감지 표현</dt>
        <dd className="text-ink">&ldquo;{log.keyword}&rdquo;</dd>
        <dt>세션 ID</dt>
        <dd className="text-ink truncate">{log.session_id}</dd>
        <dt>발신</dt>
        <dd className="text-ink">{characterName} 케어 시스템</dd>
      </dl>
    </article>
  );
}

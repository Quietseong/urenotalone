"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterPlaceholder } from "@/components/CharacterPlaceholder";
import { loadMemory, saveMemory } from "@/lib/memory";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const mem = loadMemory();
    if (mem.character_name && mem.user_name) {
      router.replace("/chat");
      return;
    }
    if (mem.parent_email) setEmail(mem.parent_email);
    setHydrated(true);
  }, [router]);

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("이메일 형식을 확인해 주세요.");
      return;
    }
    saveMemory({ parent_email: trimmed });
    router.push("/hatch");
  }

  if (!hydrated) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="size-12 animate-pulse rounded-full bg-primary-soft" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <CharacterPlaceholder variant="egg" size={180} priority />
          <h1
            className="text-4xl text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            도리와 함께
          </h1>
          <p className="text-base text-ink-muted">
            AI 아기 공룡과 매일 5분 대화하기
          </p>
        </div>

        <section className="w-full rounded-card bg-surface border border-border px-5 py-4 text-sm leading-relaxed text-ink-muted">
          <p className="font-medium text-ink mb-2">보호자 안내</p>
          <p>
            본 앱은 대회 시연용 prototype입니다. 대화 텍스트는 사용자 기기와
            LLM 처리에만 사용되며, STT(음성-텍스트 변환)는 Cycle 2에서 추가
            예정으로 현재 미사용입니다. 위기 신호 감지 시 보호자 이메일로
            알림이 발송됩니다.
          </p>
        </section>

        <form onSubmit={handleStart} className="w-full flex flex-col gap-3">
          <label htmlFor="parent-email" className="text-sm font-medium text-ink">
            보호자 이메일
          </label>
          <input
            id="parent-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="parent@example.com"
            className="w-full rounded-card border border-border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft focus:outline-none focus:border-primary-strong"
            required
          />
          {error && (
            <p className="text-sm text-crisis" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="mt-2 w-full rounded-button bg-primary-strong px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-primary-stronger active:scale-[0.99]"
          >
            시작하기
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterPlaceholder } from "@/components/CharacterPlaceholder";
import { loadMemory, saveMemory } from "@/lib/memory";
import { subjectParticle, topicParticle, vocative } from "@/lib/korean";

type Step =
  | "egg"
  | "cracking"
  | "ask-character-name"
  | "echo-character-name"
  | "ask-user-name"
  | "first-chat"
  | "farewell";

export default function HatchPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("egg");
  const [characterName, setCharacterName] = useState("");
  const [userName, setUserName] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [userAnswerDraft, setUserAnswerDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mem = loadMemory();
    if (!mem.parent_email) {
      router.replace("/");
      return;
    }
    if (mem.character_name && mem.user_name) {
      router.replace("/chat");
      return;
    }
    setHydrated(true);
  }, [router]);

  useEffect(() => {
    if (!hydrated) return;
    if (step === "egg") {
      timer.current = setTimeout(() => setStep("cracking"), 1000);
    } else if (step === "cracking") {
      timer.current = setTimeout(() => setStep("ask-character-name"), 2500);
    } else if (step === "echo-character-name") {
      timer.current = setTimeout(() => setStep("ask-user-name"), 1800);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [step, hydrated]);

  function handleSubmitCharacterName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = characterName.trim();
    if (!trimmed) return;
    saveMemory({ character_name: trimmed });
    setStep("echo-character-name");
  }

  function handleSubmitUserName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = userName.trim();
    if (!trimmed) return;
    saveMemory({
      user_name: trimmed,
      day: 1,
      last_session_at: new Date().toISOString(),
    });
    setStep("first-chat");
  }

  function handleSubmitUserAnswer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = userAnswerDraft.trim();
    if (!trimmed) return;
    setUserAnswer(trimmed);
    setStep("farewell");
  }

  function handleFinish() {
    router.push("/chat");
  }

  if (!hydrated) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="size-12 animate-pulse rounded-full bg-primary-soft" />
      </main>
    );
  }

  const inMiniChat = step === "first-chat" || step === "farewell";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
        <CharacterArt step={step} />

        {!inMiniChat && (
          <SingleBubble
            key={step}
            step={step}
            characterName={characterName}
          />
        )}

        {step === "ask-character-name" && (
          <NameForm
            value={characterName}
            onChange={setCharacterName}
            placeholder="예: 도리"
            onSubmit={handleSubmitCharacterName}
          />
        )}

        {step === "ask-user-name" && (
          <NameForm
            value={userName}
            onChange={setUserName}
            placeholder="너의 이름은?"
            onSubmit={handleSubmitUserName}
          />
        )}

        {inMiniChat && (
          <div className="w-full flex flex-col gap-3 text-left">
            <CharacterBubble
              text={`안녕 ${vocative(userName)}! 만나서 반가워. 도리는 ${userName}이랑 친해지고 싶어. ${topicParticle(userName)} 오늘 기분이 어땠어?`}
            />
            {step === "farewell" && (
              <>
                <UserBubble text={userAnswer} />
                <CharacterBubble
                  text={`그랬구나~ ${subjectParticle(userName)} 이야기 들려주니까 도리는 마음이 따뜻해졌어. 오늘은 처음 만난 날이라 짧게 만나지만, 내일은 더 많이 이야기하자! ${vocative(userName)} 잘 자고 내일 또 만나~`}
                />
              </>
            )}
          </div>
        )}

        {step === "first-chat" && (
          <form
            onSubmit={handleSubmitUserAnswer}
            className="w-full flex flex-col gap-3"
          >
            <input
              autoFocus
              type="text"
              maxLength={60}
              value={userAnswerDraft}
              onChange={(e) => setUserAnswerDraft(e.target.value)}
              placeholder="오늘 기분을 짧게 적어줘"
              className="w-full rounded-card border border-border bg-white px-4 py-3 text-center text-base text-ink placeholder:text-ink-soft focus:outline-none focus:border-primary-strong"
              required
            />
            <button
              type="submit"
              className="w-full rounded-button bg-primary-strong px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-stronger active:scale-[0.99]"
            >
              보내기
            </button>
          </form>
        )}

        {step === "farewell" && (
          <button
            onClick={handleFinish}
            className="w-full max-w-xs rounded-button bg-primary-strong px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-stronger active:scale-[0.99]"
          >
            내일 또 만나자!
          </button>
        )}
      </div>
    </main>
  );
}

function CharacterArt({ step }: { step: Step }) {
  const size = step === "first-chat" || step === "farewell" ? 160 : 220;
  if (step === "egg") {
    return (
      <div className="anim-egg-idle">
        <CharacterPlaceholder variant="egg" size={size} priority />
      </div>
    );
  }
  if (step === "cracking") {
    return (
      <div
        className="relative"
        style={{ width: size, height: size }}
        aria-label="아기 공룡이 부화하고 있어요"
      >
        <div className="absolute inset-0 flex items-center justify-center anim-hatch-egg-out anim-egg-hatch">
          <CharacterPlaceholder variant="egg" size={size} priority />
        </div>
        <div className="absolute inset-0 flex items-center justify-center anim-hatch-birth-in">
          <CharacterPlaceholder variant="birth" size={size} priority />
        </div>
      </div>
    );
  }
  if (step === "echo-character-name" || step === "first-chat") {
    return (
      <div className="anim-fade-in">
        <CharacterPlaceholder variant="speaking" size={size} />
      </div>
    );
  }
  if (step === "farewell") {
    return (
      <div className="anim-fade-in">
        <CharacterPlaceholder variant="happy" size={size} />
      </div>
    );
  }
  return (
    <div className="anim-fade-in">
      <CharacterPlaceholder variant="listening" size={size} />
    </div>
  );
}

function SingleBubble({
  step,
  characterName,
}: {
  step: Step;
  characterName: string;
}) {
  if (step === "egg" || step === "cracking") return null;

  const text =
    step === "ask-character-name"
      ? "와~ 드디어 나왔다! 안녕! 너랑 친구하고 싶은데… 나한테 이름 지어줄 수 있어?"
      : step === "echo-character-name"
        ? `${characterName}..? 내 이름은 ${characterName}이다. ${characterName}~ ${characterName}~ 좋은 이름이야!`
        : "그럼 네 이름도 알려줄래?";

  return <CharacterBubble text={text} />;
}

function CharacterBubble({ text }: { text: string }) {
  return (
    <div className="self-start max-w-[88%] rounded-bubble bg-bubble-char border border-border px-4 py-3 text-base leading-relaxed text-ink shadow-sm anim-fade-in">
      {text}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="self-end max-w-[80%] rounded-bubble bg-bubble-user px-4 py-2.5 text-base leading-relaxed text-ink shadow-sm anim-fade-in">
      {text}
    </div>
  );
}

function NameForm({
  value,
  onChange,
  placeholder,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="w-full flex flex-col gap-3">
      <input
        autoFocus
        type="text"
        maxLength={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-card border border-border bg-white px-4 py-3 text-center text-lg text-ink placeholder:text-ink-soft focus:outline-none focus:border-primary-strong"
        required
      />
      <button
        type="submit"
        className="w-full rounded-button bg-primary-strong px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-stronger active:scale-[0.99]"
      >
        보내기
      </button>
    </form>
  );
}

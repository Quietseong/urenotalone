export type SessionSummary = {
  day: number;
  date: string;
  summary: string;
  last_emotion: string;
};

export type CrisisLog = {
  keyword: string;
  category: string;
  day: number;
  session_id: string;
  email_sent: boolean;
};

export type Memory = {
  character_name: string;
  user_name: string;
  parent_email: string;
  day: number;
  friends_mentioned: string[];
  family_mentioned: string[];
  recent_sessions: SessionSummary[];
  tension_signal: 0 | 1 | 2 | 3;
  adult_referral_strength: 0 | 1 | 2 | 3;
  crisis_keyword_hits: CrisisLog[];
  last_session_at: string;
  tts_enabled: boolean;
};

export const MEMORY_KEY = "dori_memory";

export const emptyMemory = (): Memory => ({
  character_name: "",
  user_name: "",
  parent_email: "",
  day: 0,
  friends_mentioned: [],
  family_mentioned: [],
  recent_sessions: [],
  tension_signal: 0,
  adult_referral_strength: 0,
  crisis_keyword_hits: [],
  last_session_at: "",
  tts_enabled: true,
});

export function loadMemory(): Memory {
  if (typeof window === "undefined") return emptyMemory();
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return emptyMemory();
    return { ...emptyMemory(), ...(JSON.parse(raw) as Partial<Memory>) };
  } catch {
    return emptyMemory();
  }
}

export function saveMemory(patch: Partial<Memory>): Memory {
  const current = loadMemory();
  const next = { ...current, ...patch };
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  return next;
}

export function resetMemory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MEMORY_KEY);
}

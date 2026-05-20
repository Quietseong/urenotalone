import type { Memory } from "./memory";
import { vocative } from "./korean";

export type StructuredNode =
  | "greet"
  | "daily_check"
  | "emotion_followup"
  | "friend_check"
  | "positive_close";

export type CrisisCategory = "따돌림" | "언어폭력" | "자해" | "학대";

export type CrisisHit = {
  category: CrisisCategory;
  matched_keyword: string;
  severity: 1 | 2 | 3;
};

export type EmotionHint = "neutral" | "listening" | "happy" | "concerned";

export type ChatRequest = {
  session_id: string;
  user_input: string;
  memory: Memory;
  mode: "structured" | "free";
  current_node?: StructuredNode;
  turn_index: number;
};

export type ChatResponse = {
  character_response: string;
  emotion_hint: EmotionHint;
  next_node?: StructuredNode;
  crisis_hit: CrisisHit | null;
  memory_updates: Partial<Memory>;
  should_end_session: boolean;
  session_summary?: string;
};

export type GetReplyArgs = {
  session_id: string;
  user_input: string;
  memory: Memory;
  turn_index: number;
};

export const MAX_TURNS = 5;
export const FAREWELL_KEYWORDS = ["끝", "다음에", "안녕", "잘 자", "내일"];

export async function getReply(args: GetReplyArgs): Promise<ChatResponse> {
  const { user_input, memory, turn_index, session_id } = args;
  const mode: "structured" | "free" = (memory.day || 1) <= 3 ? "structured" : "free";

  const req: ChatRequest = {
    session_id,
    user_input,
    memory,
    mode,
    turn_index,
  };

  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch (err) {
    console.error("[chat-client] network error", err);
    return safeFallback(memory.user_name);
  }

  if (!res.ok) {
    console.error("[chat-client] /api/chat", res.status, await res.text().catch(() => ""));
    return safeFallback(memory.user_name);
  }

  return (await res.json()) as ChatResponse;
}

function safeFallback(userName: string): ChatResponse {
  return {
    character_response: `${vocative(userName)} 미안~ 도리가 잠깐 멍해졌어. 다시 한번 말해줄래?`,
    emotion_hint: "neutral",
    crisis_hit: null,
    memory_updates: {},
    should_end_session: false,
  };
}

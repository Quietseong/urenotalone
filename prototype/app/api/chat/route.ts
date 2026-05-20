import type {
  ChatRequest,
  ChatResponse,
  EmotionHint,
  StructuredNode,
} from "@/lib/chat-client";
import type { CrisisLog, Memory } from "@/lib/memory";
import { detectCrisis } from "@/lib/crisis";
import { buildPrompt, buildSummaryPrompt, pickNode } from "@/lib/prompts";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_TURNS = 5;
const FAREWELL_KEYWORDS = ["끝", "다음에", "안녕", "잘 자", "내일"];

const FRIEND_NAME_PATTERN =
  /(민지|서연|준호|지호|수아|예준|하준|시우|지우|서윤|하윤)/g;
const FAMILY_NAME_PATTERN =
  /(엄마|아빠|언니|오빠|누나|형|동생|할머니|할아버지|이모|삼촌|고모)/g;

async function callGemini(
  prompt: string,
  generationConfig: Record<string, unknown> = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 256,
        ...generationConfig,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini empty response");
  return text.trim();
}

export async function POST(req: Request): Promise<Response> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (
    !body.user_input ||
    typeof body.user_input !== "string" ||
    body.user_input.length > 500
  ) {
    return Response.json(
      { error: "user_input length must be 1-500" },
      { status: 400 },
    );
  }

  const crisis = detectCrisis(body.user_input);

  const newTension = Math.min(
    3,
    body.memory.tension_signal + (crisis ? 1 : 0),
  ) as 0 | 1 | 2 | 3;
  const newReferral = Math.min(
    3,
    body.memory.adult_referral_strength + (crisis ? 1 : 0),
  ) as 0 | 1 | 2 | 3;

  const { current, next } = pickNode(body.turn_index);

  const lastSession =
    body.memory.recent_sessions[body.memory.recent_sessions.length - 1];

  const prompt = buildPrompt(
    body.mode,
    {
      user_name: body.memory.user_name,
      character_name: body.memory.character_name,
      friends_mentioned: body.memory.friends_mentioned.join(", "),
      last_session_summary: lastSession?.summary ?? "",
      last_emotion: lastSession?.last_emotion ?? "중립",
      tension_signal: newTension,
      adult_referral_strength: newReferral,
      current_node: body.mode === "structured" ? current : undefined,
      next_node: body.mode === "structured" ? next : undefined,
      user_input: body.user_input,
    },
    {
      turn_index: body.turn_index,
      max_turns: MAX_TURNS,
      crisis_hit: crisis,
      tension_signal: newTension,
    },
  );

  let character_response: string;
  try {
    character_response = await callGemini(prompt);
  } catch (err) {
    console.error("[chat] gemini error", err);
    return Response.json({ error: "LLM call failed" }, { status: 502 });
  }

  const farewellHit = FAREWELL_KEYWORDS.some((k) =>
    body.user_input.includes(k),
  );
  const should_end_session =
    body.turn_index + 1 >= MAX_TURNS ||
    farewellHit ||
    crisis?.severity === 3;

  const emotion_hint: EmotionHint = crisis
    ? "concerned"
    : should_end_session
      ? "happy"
      : "listening";

  const friendsExtracted = Array.from(
    body.user_input.matchAll(FRIEND_NAME_PATTERN),
  ).map((m) => m[0]);
  const familyExtracted = Array.from(
    body.user_input.matchAll(FAMILY_NAME_PATTERN),
  ).map((m) => m[0]);

  const newFriends = Array.from(
    new Set([...body.memory.friends_mentioned, ...friendsExtracted]),
  );
  const newFamily = Array.from(
    new Set([...body.memory.family_mentioned, ...familyExtracted]),
  );

  const memory_updates: Partial<Memory> = {};
  if (newTension !== body.memory.tension_signal)
    memory_updates.tension_signal = newTension;
  if (newReferral !== body.memory.adult_referral_strength)
    memory_updates.adult_referral_strength = newReferral;
  if (newFriends.length > body.memory.friends_mentioned.length)
    memory_updates.friends_mentioned = newFriends;
  if (newFamily.length > body.memory.family_mentioned.length)
    memory_updates.family_mentioned = newFamily;
  if (crisis) {
    const log: CrisisLog = {
      keyword: crisis.matched_keyword,
      category: crisis.category,
      day: body.memory.day || 1,
      session_id: body.session_id,
      email_sent: false,
    };
    memory_updates.crisis_keyword_hits = [
      ...body.memory.crisis_keyword_hits,
      log,
    ];
  }

  let session_summary: string | undefined;
  if (should_end_session) {
    const convo = `사용자: ${body.user_input}\n도리: ${character_response}`;
    try {
      session_summary = await callGemini(
        buildSummaryPrompt(body.memory.user_name, convo),
        { temperature: 0.3, maxOutputTokens: 128 },
      );
    } catch (err) {
      console.error("[chat] summary error", err);
      session_summary = "(요약 실패) 일상 대화";
    }
  }

  const response: ChatResponse = {
    character_response,
    emotion_hint,
    next_node:
      body.mode === "structured" ? (next as StructuredNode | undefined) : undefined,
    crisis_hit: crisis,
    memory_updates,
    should_end_session,
    session_summary,
  };

  return Response.json(response);
}

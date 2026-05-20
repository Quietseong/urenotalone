import type { CrisisCategory, CrisisHit } from "./chat-client";

const CRISIS_DICT: Record<CrisisCategory, string[]> = {
  따돌림: [
    "안 놀아",
    "안놀아",
    "안놀아줘",
    "빼고",
    "빼놓고",
    "무시해",
    "무시",
    "따돌",
    "왕따",
    "혼자만",
    "혼자만 있",
    "혼자 남",
    "외로워",
    "외로움",
    "끼워 안 줘",
    "끼지 마",
    "끼지마",
    "친구 없",
    "친구가 없",
  ],
  언어폭력: [
    "저리 가",
    "저리가",
    "꺼져",
    "더러워",
    "더러",
    "못생겼",
    "못생긴",
    "바보야",
    "바보",
    "멍청이",
    "병신",
    "찌질이",
    "찐따",
    "씨발",
    "씨X",
  ],
  자해: [
    "죽고 싶",
    "죽고싶",
    "사라지고 싶",
    "사라지고싶",
    "없어졌으면",
    "아프게 하",
    "다치게",
    "긋",
    "그어",
    "살기 싫",
    "살기싫",
  ],
  학대: [
    "때렸",
    "때려",
    "때린",
    "맞았",
    "맞아",
    "맞은",
    "멍 들",
    "멍이 들",
    "혼자 있어",
    "혼자있어",
    "밥 안 줘",
    "밥안줘",
    "밥 못 먹",
    "잠 못 자",
    "잠 안 자",
  ],
};

const SEVERITY_MAP: Record<CrisisCategory, 1 | 2 | 3> = {
  따돌림: 2,
  언어폭력: 2,
  자해: 3,
  학대: 3,
};

export function detectCrisis(text: string): CrisisHit | null {
  const normalized = text.toLowerCase();
  for (const category of Object.keys(CRISIS_DICT) as CrisisCategory[]) {
    for (const kw of CRISIS_DICT[category]) {
      if (normalized.includes(kw.toLowerCase())) {
        return {
          category,
          matched_keyword: kw,
          severity: SEVERITY_MAP[category],
        };
      }
    }
  }
  return null;
}

# urenotalone — 학생 정서·행동 케어 PoC

> **"너는 혼자가 아니야"** — 7~12세 어린이가 매일 짧은 정서 체크인 대화를 AI 아기 공룡 캐릭터 **도리**와 나누는 웹 PoC.

12주 솔로 개발 PoC의 **1차 cycle (구현 가능성 검증)** 결과물입니다. 위기 신호(따돌림·언어폭력·자해·학대)가 감지되면 보호자에게 알림이 전달되는 흐름을 시연용으로 구현했습니다.

---

## 빠른 시작

```bash
git clone git@github.com:Quietseong/urenotalone.git
cd urenotalone/prototype
cp .env.local.example .env.local
# .env.local 파일을 열어 GEMINI_API_KEY를 채워주세요
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속.

**상세 설치/설정/사용법은 [`prototype/README.md`](./prototype/README.md)에 친절하게 정리되어 있습니다.**

---

## 저장소 구조

```
urenotalone/
├── prototype/        # Next.js 16 + React 19 웹 PoC (실제 동작 코드)
│   ├── app/          # 페이지 라우트 (/, /hatch, /chat, /parent)
│   ├── components/   # 캐릭터 일러스트 컴포넌트
│   ├── lib/          # TTS/STT/한국어 조사/위기 감지/LLM prompts
│   └── README.md     # ⭐ 상세 설치·실행 가이드
└── *.png             # 시연용 스크린샷 (온보딩 → 부화 → 대화 → 위기 시나리오)
```

---

## 핵심 기능

| 영역 | 구현 |
|---|---|
| **온보딩** | 알 → 부화 cross-fade 애니메이션 → 이름 짓기 → 첫 인사 |
| **대화** | Gemini LLM 기반, 캐릭터 페르소나 + 4종 금기 + 한국어 호격 조사 규칙 |
| **TTS** | 브라우저 Web Speech API (ko-KR), 토글 가능 |
| **STT** | 브라우저 Web Speech Recognition, 인식 텍스트 확인/편집 후 전송 (Chrome/Edge) |
| **위기 감지** | 4 카테고리 사전 기반 자동 태깅, severity 1~3 |
| **보호자 알림** | `/parent` 메일함 mock view (시연용 시각화) |

---

## 1차 Cycle 산출물 (acceptance criteria 충족)

- ✅ Voice 1-turn loop (STT → LLM → TTS playback)
- ✅ STT fallback: 음성 → 텍스트 편집 UI
- ✅ First session: egg → hatching animation → dinosaur → child names character
- ✅ Character name persists across sessions
- ✅ LLM 4 prohibitions (평가/강요/거짓약속/비밀보장)
- ✅ Risk keyword auto-tagging (4 카테고리)
- ✅ Static hatching animation (2-3 frames fade transition)
- ✅ 한국어 호격 조사 자연스러움 (받침 유무 자동 판별)

## 2차 Cycle 예정

- 실제 보호자 이메일 발송 (Resend 또는 Gmail SMTP)
- 측정 지표 수집 (STT 성공률, retention, fallback 빈도)
- 지인 테스터 2주 운영 protocol
- Tech spike kill criteria 평가

---

## 라이선스 / 윤리

본 prototype은 학생 정서 케어 시연용입니다. 실제 서비스 배포 전 KISA / Made for Kids / Designed for Families 등 정식 규제 준수가 필요합니다. 위기 신호 감지 로직은 보조 도구로, 실제 상담·신고 책임을 대체하지 않습니다.

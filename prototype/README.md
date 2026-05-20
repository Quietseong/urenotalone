# 도리 — 학생 정서·행동 케어 PoC

AI 아기 공룡 캐릭터 **도리**와 7~12세 어린이가 매일 짧은 정서 체크인 대화를 나누는 웹 PoC입니다. 위기 신호(따돌림·언어폭력·자해·학대)가 감지되면 보호자에게 알림이 전달되는 흐름을 시연용으로 구현했습니다.

> 이 저장소는 12주 솔로 PoC 중 **1차 cycle (구현 가능성 검증)** 결과물입니다. 대회 출품용 가상 시나리오 prototype 수준으로 만들어졌습니다.

## 핵심 기능

- **알 → 부화 → 캐릭터 명명 → 첫 대화** 풀 온보딩 흐름
- **Gemini LLM 기반 자연 대화** — 캐릭터 페르소나, 4종 금기, 한국어 호격 조사 규칙 prompt에 포함
- **TTS(음성 합성)** — 브라우저 내장 Web Speech API로 도리 응답 자동 재생, 토글 가능
- **STT(음성 인식)** — 마이크 입력 → 텍스트 확인/편집 후 전송 (Chrome/Edge 지원)
- **위기 키워드 감지** — 4 카테고리(따돌림/언어폭력/자해/학대) 사전 기반 자동 태깅
- **보호자 메일함 mock view** (`/parent`) — 시연용 시각화
- **부화 애니메이션** — egg ↔ birth cross-fade, alma 흔들림, 메시지 fade-in
- **localStorage 단일 source** — 메모리(이름·세션 요약·위기 로그 등)는 모두 브라우저에 저장

---

## 1. 사전 요구사항

| 도구 | 권장 버전 | 확인 명령 |
|---|---|---|
| Node.js | 20.x 이상 | `node -v` |
| npm | 10.x 이상 | `npm -v` |
| 브라우저 | Chrome 또는 Edge | (STT는 Chromium 계열에서만 동작) |

Node가 없거나 버전이 낮다면 [nvm](https://github.com/nvm-sh/nvm)으로 설치를 권장합니다:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

---

## 2. 저장소 클론

```bash
git clone <이 저장소 URL>
cd <저장소 디렉토리>/prototype
```

---

## 3. 의존성 설치

```bash
npm install
```

설치는 1~3분 정도 소요됩니다.

---

## 4. 환경 변수 설정

### 4-1. `.env.local` 파일 만들기

저장소에는 보안상 실제 API 키가 들어있지 않습니다. 템플릿을 복사해서 사용하세요.

```bash
cp .env.local.example .env.local
```

### 4-2. Gemini API 키 발급 (필수)

도리의 LLM 응답에 사용되는 키입니다. **이 키 하나만 있으면 앱이 동작**합니다.

1. https://aistudio.google.com/apikey 접속 (Google 계정 로그인 필요)
2. 우측 상단 **"Create API key"** 클릭
3. **"Create API key in new project"** 선택 (또는 기존 프로젝트 선택)
4. 발급된 키를 복사

### 4-3. `.env.local`에 키 붙여넣기

방금 만든 `.env.local` 파일을 열어 첫 줄에 키를 채워주세요:

```env
GEMINI_API_KEY=여기에_방금_복사한_키_붙여넣기
```

> 💡 **무료 quota로 충분합니다.** Gemini 3.1 Flash Lite는 분당 수십 회 호출이 가능해 개인 시연용으로 비용 발생 없이 사용 가능합니다.

### 4-4. (선택) 다른 키들은 비워둬도 됩니다

`GOOGLE_TTS_API_KEY`, `RESEND_API_KEY` 등은 cycle 2에서 사용 예정입니다. 현재 cycle 1에서는 비워둬도 모든 기능이 동작합니다.

---

## 5. 개발 서버 실행

```bash
npm run dev
```

성공하면 다음과 같은 출력이 나옵니다:

```
▲ Next.js 16.2.6 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
✓ Ready in ~150ms
```

브라우저에서 **http://localhost:3000** 접속.

---

## 6. 사용 흐름 (시연 시나리오)

### 첫 진입

1. `/` 온보딩 — 보호자 이메일 입력 (위기 알림이 발송될 가상 주소, 형식만 검증)
2. `/hatch` — 알이 살짝 흔들립니다 → 1초 후 부화 애니메이션 시작
3. 캐릭터 이름 짓기 (예: "도리")
4. 사용자(아이) 이름 입력 (예: "수민")
5. 첫 인사 + 미니 답변 1턴 → "내일 또 만나자!" 클릭

### 정식 대화

6. `/chat`으로 자동 이동, 도리가 음성으로 인사 (🔊 켜져있을 때)
7. 텍스트 입력 또는 **🎤 마이크** 버튼으로 음성 입력
8. 도리의 응답이 텍스트 + 음성으로 출력
9. 5턴 후 자동으로 하루 마무리 인사 + 입력창 잠금

### 위기 시나리오 시연

10. 채팅 중 위기 키워드 입력 (예: "아무도 나랑 안 놀아", "친구가 없어")
11. 도리가 평소보다 차분히 공감 + "엄마한테 이야기해봐도 좋을 거 같아" 같은 어른 안내
12. 헤더에 빨간 **📧 보호자 알림 · 메일함 보기** 배지 등장
13. 배지 클릭 → `/parent` 부모 메일함 mock view로 이동
14. 누적된 위기 알림이 이메일 카드 형식으로 표시
15. "← 대화로 돌아가기" 클릭하여 흐름 복귀

---

## 7. 헤더 컨트롤

| 버튼 | 설명 |
|---|---|
| 🔊 / 🔇 | TTS 음성 출력 토글 (설정은 localStorage에 저장됨) |
| 🎤 | 음성 입력 시작/중지 (Chrome/Edge 한정) |
| 📧 메일함 (dev 모드) | 부모 메일함 mock view 단축 링크 |
| reset (dev 모드) | 모든 메모리 초기화 후 처음으로 |

---

## 8. 문제 해결

### "GEMINI_API_KEY missing" 또는 도리가 "잠깐 멍해졌어"라고 답할 때
- `.env.local` 파일이 `prototype/` 디렉토리 안에 있는지 확인
- `GEMINI_API_KEY=` 뒤에 실제 키가 정확히 붙어있는지 확인 (따옴표 불필요)
- 서버를 재시작 (`Ctrl+C` 후 `npm run dev`)

### TTS(도리 목소리)가 안 들려요
- 헤더의 🔊 버튼이 켜져있는지 확인 (🔇이면 음소거 상태)
- 시스템 볼륨 및 브라우저 탭 음소거 확인
- Firefox는 OS 한국어 voice가 필요할 수 있음. **Chrome/Edge 권장**
- 브라우저 정책상 첫 음성 재생을 위해 페이지에서 한 번 클릭이 필요할 수 있음

### 🎤 버튼이 안 보여요
- Firefox에서는 SpeechRecognition 미지원으로 버튼이 자동 숨김
- **Chrome 또는 Edge로 접속**

### 마이크 권한이 막혀있어요
- 브라우저 주소창 좌측 자물쇠 아이콘 → 사이트 설정 → 마이크 → 허용
- localhost가 아닌 LAN IP(192.168.x.x)로 접속한 경우 HTTPS 아니면 마이크가 막힘. localhost 사용 권장

### 메모리 초기화하고 처음부터 다시 하고 싶어요
- 개발자 도구(F12) → Application → Local Storage → `dori_memory` 삭제 → 새로고침
- 또는 채팅 헤더의 `reset` 클릭 (dev 모드에서만 표시)

---

## 9. 디렉토리 구조

```
prototype/
├── app/
│   ├── page.tsx              # /  온보딩 (보호자 이메일)
│   ├── hatch/page.tsx        # /hatch  알 → 부화 → 이름 짓기
│   ├── chat/page.tsx         # /chat  메인 대화
│   ├── parent/page.tsx       # /parent  부모 메일함 mock view
│   ├── api/chat/route.ts     # Gemini API 호출
│   ├── layout.tsx
│   └── globals.css           # 디자인 토큰 + 애니메이션 keyframes
├── components/
│   └── CharacterPlaceholder.tsx
├── lib/
│   ├── memory.ts             # localStorage 메모리
│   ├── chat-client.ts        # /api/chat 호출 wrapper
│   ├── prompts.ts            # LLM system prompt (페르소나·금기·조사 규칙)
│   ├── crisis.ts             # 위기 키워드 사전 + detect
│   ├── tts.ts                # Web Speech Synthesis wrapper
│   ├── stt.ts                # Web Speech Recognition wrapper
│   └── korean.ts             # 한국어 조사 헬퍼 (vocative 등)
├── public/character/         # 캐릭터 일러스트 (egg/birth/listening/...)
├── .env.local.example        # 환경 변수 템플릿
└── package.json
```

---

## 10. 빌드 & 배포

### 로컬 프로덕션 빌드

```bash
npm run build
npm run start
```

### 타입 체크

```bash
npx tsc --noEmit
```

### 린트

```bash
npm run lint
```

---

## 11. 1차 Cycle 완료 항목 (참고)

시드 acceptance criteria 충족 현황:

- ✅ Voice 1-turn loop (STT → LLM → TTS playback)
- ✅ STT name fallback (text edit UI)
- ✅ First session: egg → hatching animation → dinosaur → child names character
- ✅ Character name persists across all sessions
- ✅ LLM 4 prohibitions (평가/강요/거짓약속/비밀보장)
- ✅ Risk keyword auto-tagging (4 카테고리, severity 1~3)
- ✅ Static illustration hatching animation (2-3 frames fade transition)
- ✅ 한국어 호격 조사 자연스러움 (받침 유무 자동 판별)

Cycle 2 예정:
- 실제 부모 이메일 발송 (Resend 또는 Gmail SMTP)
- 측정 지표(STT 성공률, retention, fallback 빈도) 수집
- 지인 테스터 2주 운영 protocol

---

## 12. 라이선스 / 윤리

- 본 prototype은 학생 정서 케어 시연용으로, 실제 서비스 배포 전 KISA/Made for Kids/Designed for Families 등 정식 규제 준수가 필요합니다.
- 위기 신호 감지 로직은 보조 도구이며, 실제 상담·신고 책임을 대체하지 않습니다.
- 음성 데이터는 브라우저 STT가 자체 처리하며 본 PoC 서버에는 텍스트만 도달합니다 (시드 제약: voice originals deleted after STT, text transcripts only).

문의 / 이슈는 GitHub Issues 탭에 남겨주세요.

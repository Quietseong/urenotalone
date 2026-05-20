export type SttStatus = "unsupported" | "idle" | "listening" | "error";

type SpeechRecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResult>> & {
    [index: number]: ArrayLike<SpeechRecognitionResult> & {
      isFinal: boolean;
      [index: number]: SpeechRecognitionResult;
    };
  };
  resultIndex: number;
};

type SpeechRecognitionErrorEventLike = { error: string };

type WindowWithSR = Window & {
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
};

function getCtor(): (new () => ISpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithSR;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSupported(): boolean {
  return getCtor() !== null;
}

export type SttHandle = {
  stop: () => void;
  abort: () => void;
};

export type SttCallbacks = {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
};

export function start(cb: SttCallbacks): SttHandle | null {
  const Ctor = getCtor();
  if (!Ctor) {
    cb.onError?.("unsupported");
    return null;
  }
  const rec = new Ctor();
  rec.lang = "ko-KR";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let finalText = "";

  rec.onstart = () => cb.onStart?.();
  rec.onresult = (event: SpeechRecognitionEventLike) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) {
        finalText += transcript;
      } else {
        interim += transcript;
      }
    }
    if (interim) cb.onInterim?.(interim);
    if (finalText) cb.onFinal(finalText);
  };
  rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
    cb.onError?.(event.error || "unknown");
  };
  rec.onend = () => cb.onEnd?.();

  try {
    rec.start();
  } catch (err) {
    cb.onError?.(err instanceof Error ? err.message : "start_failed");
    return null;
  }

  return {
    stop: () => rec.stop(),
    abort: () => rec.abort(),
  };
}

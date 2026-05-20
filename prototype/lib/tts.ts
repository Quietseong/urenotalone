export type TtsStatus = "unsupported" | "idle" | "speaking";

type Listener = (status: TtsStatus) => void;

const listeners = new Set<Listener>();
let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

function isBrowser(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isSupported(): boolean {
  return isBrowser();
}

function pickKoreanVoice(): SpeechSynthesisVoice | null {
  if (!isBrowser()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const ko =
    voices.find((v) => v.lang === "ko-KR") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("ko"));
  return ko ?? voices[0] ?? null;
}

function ensureVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const picked = pickKoreanVoice();
  if (picked) {
    cachedVoice = picked;
    voicesReady = true;
  }
  return picked;
}

function notify(status: TtsStatus) {
  listeners.forEach((cb) => cb(status));
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function primeVoices(): void {
  if (!isBrowser() || voicesReady) return;
  ensureVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = null;
    ensureVoice();
  });
}

export function speak(text: string): void {
  if (!isBrowser() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voice = ensureVoice();
  if (voice) utter.voice = voice;
  utter.lang = "ko-KR";
  utter.rate = 1.0;
  utter.pitch = 1.15;
  utter.onstart = () => notify("speaking");
  utter.onend = () => notify("idle");
  utter.onerror = () => notify("idle");
  synth.speak(utter);
}

export function cancel(): void {
  if (!isBrowser()) return;
  window.speechSynthesis.cancel();
  notify("idle");
}

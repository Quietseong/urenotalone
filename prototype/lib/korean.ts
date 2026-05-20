const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

function lastSyllableHasFinal(name: string): boolean | null {
  if (!name) return null;
  const last = name[name.length - 1];
  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return null;
  return (code - HANGUL_START) % 28 !== 0;
}

export function vocative(name: string): string {
  const final = lastSyllableHasFinal(name);
  if (final === null) return name;
  return final ? `${name}아` : `${name}야`;
}

export function subjectParticle(name: string): string {
  const final = lastSyllableHasFinal(name);
  if (final === null) return `${name}는`;
  return final ? `${name}이` : `${name}는`;
}

export function topicParticle(name: string): string {
  const final = lastSyllableHasFinal(name);
  if (final === null) return `${name}는`;
  return final ? `${name}은` : `${name}는`;
}

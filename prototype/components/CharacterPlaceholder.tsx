import Image from "next/image";

export type CharacterVariant =
  | "egg"
  | "birth"
  | "listening"
  | "speaking"
  | "happy"
  | "sad";

const labels: Record<CharacterVariant, string> = {
  egg: "알",
  birth: "방금 부화한 아기 공룡",
  listening: "이야기를 듣고 있는 아기 공룡",
  speaking: "말하고 있는 아기 공룡",
  happy: "기뻐하는 아기 공룡",
  sad: "슬퍼하는 아기 공룡",
};

type Props = {
  variant: CharacterVariant;
  size?: number;
  priority?: boolean;
  className?: string;
};

export function CharacterPlaceholder({
  variant,
  size = 200,
  priority = false,
  className,
}: Props) {
  return (
    <Image
      src={`/character/${variant}.png`}
      alt={labels[variant]}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: "auto" }}
    />
  );
}

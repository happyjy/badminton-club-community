import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string | null;
  /** 바탕색을 고르는 기준. 이름이 같아도 색이 달라야 하면 id를 넘긴다. */
  seed?: string;
  size?: 28 | 36 | 56;
  className?: string;
}

const SIZE_CLASS = {
  28: 'h-7 w-7 text-caption',
  36: 'h-9 w-9 text-footnote',
  56: 'h-14 w-14 text-title',
} as const;

// Tailwind가 클래스를 찾을 수 있게 완성된 문자열로 적는다.
const PALETTE = [
  'bg-avatar-1',
  'bg-avatar-2',
  'bg-avatar-3',
  'bg-avatar-4',
  'bg-avatar-5',
  'bg-avatar-6',
] as const;

/** 같은 seed면 언제나 같은 바탕색. */
export function avatarColorClass(seed: string): string {
  let sum = 0;
  for (const char of seed) {
    sum += char.codePointAt(0) ?? 0;
  }
  return PALETTE[sum % PALETTE.length];
}

/** 프로필 사진. 사진이 없거나 못 불러오면 이름 첫 글자를 보여 준다. */
export function Avatar({ name, src, seed, size = 36, className }: AvatarProps) {
  // 실패한 주소를 기억해 둔다. 주소가 바뀌면 다시 시도하게 된다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 서버가 그린 <img>는 React가 붙기 전에 실패할 수 있고, 그러면 onError가
  // 불리지 않는다. 이미 끝났는데 크기가 0이면 실패한 것으로 본다.
  useEffect(() => {
    const img = imgRef.current;
    if (src && img && img.complete && img.naturalWidth === 0) {
      setFailedSrc(src);
    }
  }, [src]);

  const base = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-on-avatar',
    SIZE_CLASS[size],
    className
  );

  if (src && failedSrc !== src) {
    return (
      // 카카오 프로필 등 외부 주소가 섞여 next/image의 허용 도메인으로
      // 관리하기 어렵고, 크기가 작아 최적화 이득도 없다.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className={cn(base, 'object-cover')}
      />
    );
  }

  // Array.from으로 잘라야 이모지 같은 글자가 반으로 쪼개지지 않는다.
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';

  return (
    <span
      role="img"
      aria-label={name.trim() || '이름 없음'}
      className={cn(base, avatarColorClass(seed ?? name))}
    >
      {initial}
    </span>
  );
}

export default Avatar;

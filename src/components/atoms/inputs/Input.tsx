import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

/** 입력칸 공통 모양. Select·Textarea도 이것을 쓴다. */
export const inputClassName = cn(
  'block h-11 rounded-md border border-border bg-surface px-3 text-primary',
  'placeholder:text-tertiary',
  'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
  'aria-[invalid=true]:border-negative',
  'disabled:cursor-not-allowed disabled:opacity-50'
);

// 16px보다 작은 글자 크기 클래스. 반응형·상태 접두어(sm:, focus:)가 붙어도 잡는다.
const SMALL_TEXT = /^(?:[a-z0-9-]+:)*text-(?:xs|sm|caption|footnote|callout)$/;

/**
 * 호출부 className에서 16px보다 작은 글자 크기만 지운다.
 * 아이폰은 16px보다 작은 입력칸을 누르면 화면을 확대한다.
 * 더 큰 글자(text-lg 등)와 글자색은 그대로 둔다.
 */
export function withMinBodyText(className?: string): string {
  if (!className) return '';
  return className
    .split(/\s+/)
    .filter((cls) => cls && !SMALL_TEXT.test(cls))
    .join(' ');
}

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { fullWidth = true, className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        inputClassName,
        'text-body',
        fullWidth && 'w-full',
        withMinBodyText(className)
      )}
      {...props}
    />
  );
});

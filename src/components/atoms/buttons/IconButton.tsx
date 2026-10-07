import { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  /** 아이콘만 있어 글자가 없으므로 화면 낭독기용 이름이 꼭 필요하다. */
  'aria-label': string;
  variant?: 'plain' | 'filled';
}

/** 아이콘만 있는 버튼. 터치 영역 44 × 44. children에 lucide 아이콘을 넣는다. */
export function IconButton({
  variant = 'plain',
  type = 'button',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary',
        'transition-opacity duration-150 active:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'filled' && 'bg-fill',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default IconButton;

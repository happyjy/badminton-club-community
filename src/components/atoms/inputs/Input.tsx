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

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { fullWidth = true, className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      // text-body를 맨 뒤에 둔다. 16px보다 작으면 아이폰이 입력할 때
      // 화면을 확대하므로, 호출부가 준 글자 크기보다 이쪽이 이겨야 한다.
      className={cn(
        inputClassName,
        fullWidth && 'w-full',
        className,
        'text-body'
      )}
      {...props}
    />
  );
});

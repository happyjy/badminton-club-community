import { cn } from '@/lib/utils';

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      // accent-accent: 브라우저 기본 체크박스를 강조색으로 칠한다.
      className={cn('mr-2 h-5 w-5 shrink-0 accent-accent', className)}
      {...props}
    />
  );
}

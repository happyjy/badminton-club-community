import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface NoticeProps {
  tone?: 'neutral' | 'warning' | 'negative';
  children: ReactNode;
  /** 오른쪽 동작. 보통 Button 하나 */
  action?: ReactNode;
  className?: string;
}

// Tailwind가 클래스를 찾을 수 있게 완성된 문자열로 적는다.
const TONE_CLASS = {
  neutral: 'bg-surface-muted text-secondary',
  warning: 'bg-warning-soft text-warning',
  negative: 'bg-negative-soft text-negative',
} as const;

/** 화면 위쪽의 안내 상자. 상태를 알리거나 다음에 할 일을 안내한다. */
export function Notice({
  tone = 'neutral',
  children,
  action,
  className,
}: NoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        'mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md px-4 py-3 text-footnote',
        TONE_CLASS[tone],
        className
      )}
    >
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}

export default Notice;

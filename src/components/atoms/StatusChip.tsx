import { ReactNode } from 'react';

import { StatusDomain, statusTone, Tone } from '@/constants/statusTone';
import { cn } from '@/lib/utils';

interface BaseProps {
  children: ReactNode;
  className?: string;
}

type StatusChipProps = BaseProps &
  (
    | { tone: Tone; domain?: never; status?: never }
    | { tone?: never; domain: StatusDomain; status: string | null | undefined }
  );

// Tailwind가 클래스를 찾을 수 있게 완성된 문자열로 적는다.
const TONE_CLASS: Record<Tone, string> = {
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  negative: 'bg-negative-soft text-negative',
  neutral: 'bg-neutral-soft text-neutral',
};

/**
 * 상태 칩. 색만 정하고 글자는 호출부가 넣는다.
 * <StatusChip tone="positive">참석</StatusChip>
 * <StatusChip domain="guest" status={guest.status}>승인</StatusChip>
 */
export function StatusChip(props: StatusChipProps) {
  // tone을 직접 받은 꼴과 domain·status를 받은 꼴을 가른다.
  const tone =
    props.tone !== undefined
      ? props.tone
      : statusTone(props.domain, props.status);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold',
        TONE_CLASS[tone],
        props.className
      )}
    >
      {props.children}
    </span>
  );
}

export default StatusChip;

import { ReactNode } from 'react';

import { Button } from '@/components/atoms/buttons/Button';

import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  /** 고른 행의 수. 0이면 그리지 않는다 */
  count: number;
  /** 세는 단위 */
  unit?: string;
  onClear: () => void;
  /** 일괄 동작 버튼 */
  children: ReactNode;
  className?: string;
}

/** 표에서 행을 고르면 표 아래에 나타나는 줄. "N명 선택됨" + 일괄 동작. */
export function BulkActionBar({
  count,
  unit = '명',
  onClear,
  children,
  className,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <section
      aria-label="선택한 항목"
      className={cn(
        // 휴대폰에서는 탭바 위에, PC에서는 화면 아래에 붙는다.
        'sticky bottom-[calc(var(--tabbar-h)+12px)] z-dropdown mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 shadow-overlay lg:bottom-4',
        className
      )}
    >
      <span className="text-callout font-semibold text-primary">
        {count}
        {unit} 선택됨
      </span>
      <Button type="button" variant="plain" size="sm" onClick={onClear}>
        선택 해제
      </Button>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </section>
  );
}

export default BulkActionBar;

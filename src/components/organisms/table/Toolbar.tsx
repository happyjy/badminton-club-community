import { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { Input } from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface ToolbarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    /** 검색칸의 이름으로도 쓴다 */
    placeholder: string;
  };
  /** 필터 (Select, SegmentedControl) */
  children?: ReactNode;
  /** "총 12명" 같은 요약 */
  summary?: ReactNode;
  /** 오른쪽 동작 버튼 */
  actions?: ReactNode;
  className?: string;
}

/** 표 위의 도구줄. 검색칸 + 필터 + 오른쪽 동작. 좁으면 줄을 바꾼다. */
export function Toolbar({
  search,
  children,
  summary,
  actions,
  className,
}: ToolbarProps) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-center gap-2', className)}>
      {search && (
        <div className="relative w-full lg:w-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
          />
          <Input
            type="search"
            aria-label={search.placeholder}
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {children}
      {(summary || actions) && (
        <div className="ml-auto flex items-center gap-3">
          {summary && (
            <span className="text-footnote text-secondary">{summary}</span>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

export default Toolbar;

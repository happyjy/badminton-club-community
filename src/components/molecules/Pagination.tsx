import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '@/components/atoms/buttons/IconButton';

import { getPageNumbers } from '@/lib/pagination';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  /** 1부터 센다 */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

/** 쪽 번호 줄. 쪽이 하나뿐이면 그리지 않는다. */
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="페이지"
      className={cn('flex items-center justify-center gap-0.5', className)}
    >
      <IconButton
        aria-label="이전 쪽"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="h-9 w-9"
      >
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </IconButton>

      {getPageNumbers(page, totalPages).map((item, index) =>
        item === '…' ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="w-6 text-center text-footnote text-tertiary"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`${item}쪽`}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => {
              if (item !== page) onChange(item);
            }}
            className={cn(
              // 폭 360 휴대폰에서 7칸과 화살표가 한 줄에 들어가도록 좁게 잡는다.
              // after: 보이는 크기는 작지만 터치 영역을 44까지 넓힌다.
              "relative h-9 min-w-8 rounded-sm px-1 text-callout after:absolute after:-inset-1 after:content-['']",
              'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              item === page
                ? 'bg-accent font-semibold text-on-accent'
                : 'text-secondary'
            )}
          >
            {item}
          </button>
        )
      )}

      <IconButton
        aria-label="다음 쪽"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="h-9 w-9"
      >
        <ChevronRight aria-hidden className="h-5 w-5" />
      </IconButton>
    </nav>
  );
}

export default Pagination;

import { ReactNode } from 'react';

import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** 왼쪽: 아바타, 아이콘 */
  leading?: ReactNode;
  /** 오른쪽: 상태 칩, 값 */
  trailing?: ReactNode;
  /** 있으면 링크가 된다 */
  href?: string;
  /** href 없이 이것만 있으면 버튼이 된다 */
  onClick?: () => void;
  /** 지금 있는 화면의 메뉴일 때 'page' */
  'aria-current'?: 'page';
  className?: string;
}

/** ListGroup 안의 한 줄. 누를 수 있는 행에는 오른쪽에 화살표가 붙는다. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  href,
  onClick,
  'aria-current': ariaCurrent,
  className,
}: ListRowProps) {
  const interactive = Boolean(href || onClick);

  const rowClass = cn(
    'flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left',
    interactive && 'transition-colors duration-150 active:bg-fill',
    className
  );

  const content = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-headline text-primary">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-footnote text-secondary">
            {subtitle}
          </span>
        )}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
      {interactive && (
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-tertiary" />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={ariaCurrent}
        className={rowClass}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={ariaCurrent}
        className={rowClass}
      >
        {content}
      </button>
    );
  }

  return (
    <div aria-current={ariaCurrent} className={rowClass}>
      {content}
    </div>
  );
}

export default ListRow;

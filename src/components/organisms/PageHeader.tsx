import { ReactNode } from 'react';

import Link from 'next/link';

import { ChevronLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** 있으면 제목 위에 '뒤로' 링크를 둔다 */
  backHref?: string;
  /** 오른쪽 동작. 보통 Button 하나 */
  action?: ReactNode;
  className?: string;
}

/** 화면 맨 위의 큰 제목 영역. 화면마다 하나만 쓴다 (h1). */
export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-4', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="-ml-2 inline-flex h-11 items-center pr-3 text-callout text-secondary"
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
          뒤로
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-large-title text-primary">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-footnote text-secondary">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export default PageHeader;

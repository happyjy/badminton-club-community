import { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 다음에 할 수 있는 일. 보통 Button 하나 */
  action?: ReactNode;
  className?: string;
}

/** 목록이 비었을 때 보여 주는 안내. 말투는 부드럽게 쓴다 (설계 W3). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-4 py-12 text-center',
        className
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          strokeWidth={1.5}
          className="mb-3 h-10 w-10 text-tertiary"
        />
      )}
      <h3 className="text-headline text-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-callout text-secondary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;

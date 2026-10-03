import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface InfoItemProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** InfoSection 안의 한 줄: 왼쪽에 항목 이름, 오른쪽에 값. */
export const InfoItem = ({ label, children, className }: InfoItemProps) => {
  return (
    <div
      className={cn(
        'flex min-h-11 items-center justify-between gap-4 px-4 py-3',
        className
      )}
    >
      <span className="shrink-0 text-body text-secondary">{label}</span>
      <div className="min-w-0 break-words text-right text-body text-primary">
        {children}
      </div>
    </div>
  );
};

export default InfoItem;

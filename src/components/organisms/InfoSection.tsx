import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface InfoSectionProps {
  title: string;
  children: ReactNode;
  /** 항목 줄(InfoItem)이 아니라 글·목록 같은 내용을 통째로 담을 때 */
  fullWidth?: boolean;
  className?: string;
}

/**
 * 제목이 붙은 정보 묶음. 기본은 InfoItem 줄들을 얇은 선으로 나눠 담고,
 * fullWidth면 내용을 그대로 한 면에 담는다.
 */
export const InfoSection = ({
  title,
  children,
  fullWidth = false,
  className,
}: InfoSectionProps) => {
  return (
    <section className={className}>
      <h2 className="px-4 pb-2 text-footnote text-secondary">{title}</h2>
      <div
        className={cn(
          'overflow-hidden rounded-md bg-surface',
          fullWidth ? 'p-4' : 'divide-y-[0.5px] divide-separator'
        )}
      >
        {children}
      </div>
    </section>
  );
};

export default InfoSection;

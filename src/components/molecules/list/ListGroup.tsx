import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ListGroupProps {
  /** 묶음 위의 작은 머리글 */
  label?: string;
  /** 묶음 아래의 안내 문구 */
  footer?: ReactNode;
  children: ReactNode;
  /** 묶음의 바탕. 흰 시트 안에서는 inset(연회색)을 써서 묶음이 구분되게 한다 */
  tone?: 'surface' | 'inset';
  className?: string;
}

/**
 * iOS 설정 앱 방식의 묶음 리스트. 연회색 바탕 위의 흰 묶음이고
 * 행 사이는 얇은 선으로 나눈다. 자식으로 ListRow를 넣는다.
 */
export function ListGroup({
  label,
  footer,
  children,
  tone = 'surface',
  className,
}: ListGroupProps) {
  return (
    <section className={className}>
      {label && (
        <h3 className="px-4 pb-2 text-footnote text-secondary">{label}</h3>
      )}
      <div
        className={cn(
          'overflow-hidden rounded-md',
          tone === 'inset' ? 'bg-bg' : 'bg-surface',
          'divide-y-[0.5px] divide-separator'
        )}
      >
        {children}
      </div>
      {footer && (
        <p className="px-4 pt-2 text-footnote text-secondary">{footer}</p>
      )}
    </section>
  );
}

export default ListGroup;

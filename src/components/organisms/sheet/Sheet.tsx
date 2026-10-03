import { ReactNode } from 'react';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { X } from 'lucide-react';

import { IconButton } from '@/components/atoms/buttons/IconButton';

import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  /** ESC, 바깥 누르기, 닫기 버튼에서 모두 불린다. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 아래에 고정되는 버튼 영역. 긴 폼의 제출 버튼을 여기에 둔다. */
  footer?: ReactNode;
  hideCloseButton?: boolean;
  /** 패널에 붙는다. 폭을 바꿀 때 쓴다 (예: md:max-w-lg). */
  className?: string;
}

/**
 * 떠 있는 창. 휴대폰에서는 아래에서 올라오는 시트, md 이상에서는 가운데 모달.
 * 포커스 가두기·ESC·스크롤 잠금·포털은 headlessui Dialog가 처리한다.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  hideCloseButton = false,
  className,
}: SheetProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-sheet">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-scrim transition-opacity duration-200 ease-out data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 flex items-end justify-center md:items-center md:p-4">
        <DialogPanel
          transition
          className={cn(
            'flex max-h-[90dvh] w-full flex-col rounded-t-lg bg-surface shadow-overlay',
            'md:max-w-md md:rounded-lg',
            'transition duration-200 ease-out',
            'data-[closed]:translate-y-full md:data-[closed]:translate-y-0 md:data-[closed]:opacity-0',
            className
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 pl-4 pr-1 pt-2">
            <DialogTitle className="text-title text-primary">
              {title}
            </DialogTitle>
            {hideCloseButton ? (
              // 닫기 버튼이 없어도 제목 줄의 높이가 같도록 자리를 남긴다.
              <span className="h-11" />
            ) : (
              <IconButton aria-label="닫기" onClick={onClose}>
                <X aria-hidden className="h-5 w-5" />
              </IconButton>
            )}
          </header>

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2',
              // footer가 없으면 본문이 홈 인디케이터 여백을 맡는다.
              footer ? 'pb-4' : 'pb-[calc(16px+env(safe-area-inset-bottom))]'
            )}
          >
            {children}
          </div>

          {footer && (
            <footer className="shrink-0 border-t border-border px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
              {footer}
            </footer>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default Sheet;

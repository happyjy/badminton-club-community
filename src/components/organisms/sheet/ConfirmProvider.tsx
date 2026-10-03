import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Sheet } from '@/components/organisms/sheet/Sheet';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** 기본 '확인' */
  confirmLabel?: string;
  /** 기본 '취소' */
  cancelLabel?: string;
  /** 삭제처럼 되돌릴 수 없는 동작이면 확인 버튼을 빨강 글자로 */
  destructive?: boolean;
  /** 취소 버튼을 숨긴다. alert() 대신 쓸 때 */
  hideCancel?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * window.confirm / alert를 대신하는 확인창을 앱 전체에 하나 둔다.
 * _app.tsx에서 한 번 감싸고, 화면에서는 useConfirm()으로 부른다.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // 닫히는 애니메이션 동안에도 글자가 남아 있도록 options는 따로 둔다.
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolveRef = useRef<((result: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<Confirm>((next) => {
    // 이미 떠 있으면 먼저 것은 취소로 끝낸다. 끝나지 않는 Promise를 남기지 않는다.
    resolveRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(next);
      setOpen(true);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={open}
        onClose={() => settle(false)}
        title={options.title}
        hideCloseButton
        footer={
          <div className="flex gap-2">
            {!options.hideCancel && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => settle(false)}
              >
                {options.cancelLabel ?? '취소'}
              </Button>
            )}
            <Button
              type="button"
              variant={options.destructive ? 'destructive' : 'primary'}
              className="flex-1"
              onClick={() => settle(true)}
            >
              {options.confirmLabel ?? '확인'}
            </Button>
          </div>
        }
      >
        {options.message && (
          <p className="whitespace-pre-line text-body text-secondary">
            {options.message}
          </p>
        )}
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error(
      'useConfirm은 ConfirmProvider 안에서만 쓸 수 있습니다. _app.tsx를 확인하세요.'
    );
  }
  return confirm;
}

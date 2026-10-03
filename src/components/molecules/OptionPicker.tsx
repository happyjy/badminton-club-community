import { KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Check, ChevronDown, type LucideIcon } from 'lucide-react';

import { Sheet } from '@/components/organisms/sheet/Sheet';

import { cn } from '@/lib/utils';

interface OptionPickerProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  /** 무엇을 고르는지 (예: '정렬'). 시트의 제목과 화면 낭독기용 이름이 된다 */
  'aria-label': string;
  /** 글자 앞의 아이콘 */
  icon?: LucideIcon;
  /** PC 메뉴가 버튼의 어느 쪽에 맞춰 열리는가 */
  align?: 'left' | 'right';
  /** 버튼에 붙는다 */
  className?: string;
}

/** 화면 폭이 PC인가. 렌더 중이 아니라 누르는 순간에만 읽는다. */
const isDesktop = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(min-width: 1024px)').matches;

/**
 * 정렬·필터처럼 "화면을 보는 방식"을 고르는 버튼.
 * 휴대폰에서는 아래 시트로, PC에서는 버튼 아래 메뉴로 항목을 보여 준다.
 * 폼의 입력값에는 쓰지 않는다 (그때는 Select).
 */
export function OptionPicker<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  icon: Icon,
  align = 'left',
  className,
}: OptionPickerProps<T>) {
  // 닫힘 / 시트(휴대폰) / 메뉴(PC)
  const [mode, setMode] = useState<'closed' | 'sheet' | 'menu'>('closed');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  const close = () => setMode('closed');
  const closeMenu = () => {
    close();
    triggerRef.current?.focus();
  };

  const pick = (next: T) => {
    if (next !== value) onChange(next);
  };

  // PC 메뉴: 열리면 고른 항목(없으면 첫 항목)에 초점, 바깥을 누르면 닫는다.
  useEffect(() => {
    if (mode !== 'menu') return;

    const items =
      menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    const current = menuRef.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]'
    );
    (current ?? items?.[0])?.focus();

    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMode('closed');
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [mode]);

  const onKeyDownMenu = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === 'Tab') {
      close();
      return;
    }

    const step =
      event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;

    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + step + items.length) % items.length]?.focus();
  };

  const renderOptions = (onPicked: () => void, variant: 'sheet' | 'menu') =>
    options.map((option) => {
      const isSelected = option.value === value;

      return (
        <button
          key={option.value}
          type="button"
          role="option"
          aria-selected={isSelected}
          onClick={() => {
            pick(option.value);
            onPicked();
          }}
          className={cn(
            'flex w-full items-center justify-between gap-3 text-left text-primary',
            'transition-colors duration-150 focus-visible:outline-none',
            variant === 'sheet'
              ? 'min-h-12 px-4 py-3 text-body active:bg-fill focus-visible:bg-fill'
              : 'min-h-9 rounded-sm px-3 py-2 text-callout hover:bg-fill focus-visible:bg-fill',
            isSelected && 'font-semibold'
          )}
        >
          {option.label}
          {isSelected && (
            <Check aria-hidden className="h-5 w-5 shrink-0 text-primary" />
          )}
        </button>
      );
    });

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={mode !== 'closed'}
        aria-label={selected ? `${ariaLabel}: ${selected.label}` : ariaLabel}
        onClick={() =>
          setMode((prev) =>
            prev !== 'closed' ? 'closed' : isDesktop() ? 'menu' : 'sheet'
          )
        }
        className={cn(
          // 입력칸이 아니라 글자 버튼이다. 테두리 없이 글자와 화살표만 둔다.
          // 좁은 줄에서도 글자가 꺾이거나 눌리지 않는다.
          'inline-flex h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-callout font-medium text-primary',
          'transition-opacity duration-150 active:opacity-60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          className
        )}
      >
        {Icon && <Icon aria-hidden className="h-4 w-4 text-secondary" />}
        {selected?.label ?? ariaLabel}
        <ChevronDown aria-hidden className="h-4 w-4 text-secondary" />
      </button>

      {mode === 'menu' && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={onKeyDownMenu}
          className={cn(
            'absolute top-full z-dropdown mt-1 min-w-40 rounded-md border border-border bg-surface p-1 shadow-overlay',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {renderOptions(closeMenu, 'menu')}
        </div>
      )}

      <Sheet open={mode === 'sheet'} onClose={close} title={ariaLabel}>
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="-mx-4 divide-y-[0.5px] divide-separator"
        >
          {renderOptions(close, 'sheet')}
        </div>
      </Sheet>
    </div>
  );
}

export default OptionPicker;

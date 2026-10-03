import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  /** 무엇을 고르는지. 화면 낭독기가 읽는다. */
  'aria-label': string;
  className?: string;
}

/** 2–4개 중 하나를 고르는 이어 붙인 버튼. 항목이 더 많으면 Select를 쓴다. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const hasSelection = options.some((option) => option.value === value);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex h-9 rounded-sm bg-fill p-0.5', className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        // 고른 항목만 탭으로 닿고, 그 안에서는 방향키로 옮긴다 (radiogroup 관례).
        // 아무것도 고르지 않았으면 첫 항목이 닿는다.
        const tabbable = hasSelection ? selected : index === 0;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabbable ? 0 : -1}
            onKeyDown={(event) => {
              const step =
                event.key === 'ArrowRight' || event.key === 'ArrowDown'
                  ? 1
                  : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                    ? -1
                    : 0;
              // Alt+←(뒤로 가기) 같은 브라우저 단축키는 가로채지 않는다.
              if (
                step === 0 ||
                event.altKey ||
                event.metaKey ||
                event.ctrlKey
              ) {
                return;
              }

              event.preventDefault();
              const next = (index + step + options.length) % options.length;
              const buttons =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="radio"]'
                );
              buttons?.[next]?.focus();
              onChange(options[next].value);
            }}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
            className={cn(
              // after: 보이는 높이는 32지만 터치 영역을 44까지 넓힌다.
              "relative flex-1 whitespace-nowrap rounded-[6px] px-3 text-footnote after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
              'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              selected
                ? 'bg-raised font-semibold text-primary'
                : 'font-medium text-secondary'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;

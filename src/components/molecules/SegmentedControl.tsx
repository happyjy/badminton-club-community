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
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex h-9 rounded-sm bg-fill p-0.5', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
            className={cn(
              // after: 보이는 높이는 32지만 터치 영역을 44까지 넓힌다.
              "relative flex-1 whitespace-nowrap rounded-[6px] px-3 text-footnote after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
              'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              selected
                ? 'bg-surface font-semibold text-primary'
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

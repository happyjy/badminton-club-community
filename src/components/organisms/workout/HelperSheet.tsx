import type { StaticImageData } from 'next/image';

import { Check } from 'lucide-react';

import { Button } from '@/components/atoms/buttons/Button';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import badmintonNetIcon from '@/icon/badmintonNet.svg';
import badmintonShuttleCockIcon from '@/icon/badmintonShuttleCock.svg';
import broomStickIcon from '@/icon/broomStick.svg';
import keyIcon from '@/icon/key.svg';
import mopIcon from '@/icon/mop.svg';
import { cn } from '@/lib/utils';

/** 운동 때 한 도움의 종류. 서버(helper-status API)에 그대로 보내는 값이다. */
export type SelectedIcon = 'net' | 'broomStick' | 'shuttlecock' | 'key' | 'mop';

export const HELPER_OPTIONS: Array<{
  value: SelectedIcon;
  label: string;
  icon: StaticImageData | string;
}> = [
  { value: 'net', label: '네트 설치', icon: badmintonNetIcon },
  { value: 'broomStick', label: '바닥 청소', icon: broomStickIcon },
  {
    value: 'shuttlecock',
    label: '셔틀콕 정리',
    icon: badmintonShuttleCockIcon,
  },
  { value: 'key', label: '열쇠', icon: keyIcon },
  { value: 'mop', label: '걸레질', icon: mopIcon },
];

function HelperImage({
  value,
  decorative = false,
  className,
}: {
  value: SelectedIcon;
  /** 옆에 이름이 글자로 있으면 그림 이름을 되풀이해 읽지 않게 한다 */
  decorative?: boolean;
  className?: string;
}) {
  const option = HELPER_OPTIONS.find((candidate) => candidate.value === value);
  if (!option) return null;

  return (
    // 작은 svg라 next/image의 최적화가 필요 없다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof option.icon === 'string' ? option.icon : option.icon.src}
      alt={decorative ? '' : option.label}
      className={className}
    />
  );
}

/** 참여자 이름 옆에 붙는 작은 도움 그림들 */
export function HelperIcons({ icons }: { icons: SelectedIcon[] }) {
  if (icons.length === 0) return null;

  return (
    <span className="flex shrink-0 gap-1">
      {icons.map((icon) => (
        <HelperImage key={icon} value={icon} className="h-4 w-4" />
      ))}
    </span>
  );
}

interface HelperSheetProps {
  open: boolean;
  onClose: () => void;
  /** 누구의 기록인지 */
  name: string;
  selected: SelectedIcon[];
  onToggle: (icon: SelectedIcon) => void;
  /** 저장 중인 항목. 끝날 때까지 다시 누를 수 없다 */
  pending?: SelectedIcon[];
  /** 한도 초과·저장 실패 같은 안내 */
  message?: string | null;
}

/**
 * 참여자가 운동 때 한 도움(네트 설치, 청소 등)을 기록하는 시트.
 * 여러 개를 연달아 고를 수 있도록 항목을 눌러도 닫히지 않는다.
 */
export function HelperSheet({
  open,
  onClose,
  name,
  selected,
  onToggle,
  pending = [],
  message,
}: HelperSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${name}님의 도움 기록`}
      footer={
        <Button type="button" className="w-full" onClick={onClose}>
          완료
        </Button>
      }
    >
      <div className="divide-y-[0.5px] divide-separator overflow-hidden rounded-md bg-bg">
        {HELPER_OPTIONS.map(({ value, label }) => {
          const isSelected = selected.includes(value);

          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              disabled={pending.includes(value)}
              onClick={() => onToggle(value)}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 active:bg-fill disabled:opacity-50"
            >
              <HelperImage
                value={value}
                decorative
                className="h-6 w-6 shrink-0"
              />
              <span
                className={cn(
                  'flex-1 text-body text-primary',
                  isSelected && 'font-semibold'
                )}
              >
                {label}
              </span>
              {isSelected && (
                <Check aria-hidden className="h-5 w-5 shrink-0 text-primary" />
              )}
            </button>
          );
        })}
      </div>
      {message && (
        <p role="alert" className="mt-3 text-callout text-negative">
          {message}
        </p>
      )}
    </Sheet>
  );
}

export default HelperSheet;

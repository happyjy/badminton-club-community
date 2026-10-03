import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind.config.ts의 fontSize 토큰 이름. text-body를 글자색이 아니라
// 글자 크기로 알려 줘야 text-secondary 같은 색 토큰과 함께 남는다.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'large-title',
            'title',
            'headline',
            'body',
            'callout',
            'footnote',
            'caption',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 날짜를 'YYYY-MM-DD HH:mm' 형식으로 포맷팅합니다.
 */
export function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// todo: 원하는 형식으로 포맷팅할 수 있도록 수정하기
/**
 * 날짜를 'YYYY.MM.DD' 형식으로 포맷팅합니다.
 */
export function formatDateSimple(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

/**
 * 날짜를 짧게 보여 준다. 올해면 '9.13', 올해가 아니면 '2025.9.13'.
 * 좁은 화면의 목록에서 쓴다. 잘못된 값이면 '-'.
 */
export function formatDateCompact(
  dateInput: string | Date,
  now: Date = new Date()
): string {
  let year: number;
  let month: number;
  let day: number;

  // 'YYYY-MM-DD'는 시간대에 따라 하루 밀리지 않도록 숫자를 그대로 읽는다.
  const dateOnly =
    typeof dateInput === 'string'
      ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput)
      : null;

  if (dateOnly) {
    [year, month, day] = dateOnly.slice(1).map(Number);
  } else {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '-';
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }

  return year === now.getFullYear()
    ? `${month}.${day}`
    : `${year}.${month}.${day}`;
}

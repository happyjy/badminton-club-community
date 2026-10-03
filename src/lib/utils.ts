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

import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = path.resolve(__dirname, '../..');

/** 화면을 그리는 파일 전부: components와 pages(API 제외), 그리고 클래스를 돌려주는 lib. */
function screenFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'api'
        ? []
        : screenFiles(full);
    }
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')
      ? [path.relative(SRC, full).split(path.sep).join('/')]
      : [];
  });
}

/**
 * 6단계부터는 목록을 따로 두지 않고 화면 파일 전체를 본다.
 * 옛 색·이모지·그라디언트가 어디에도 다시 들어오면 안 된다.
 */
// CSS 변수를 쓸 수 없어 색 값을 직접 적는 곳
const COLOR_VALUE_ALLOWED = [
  'pages/_document.tsx', // <meta name="theme-color">
  'components/LocatorProvider.tsx', // 개발 도구(locatorjs) 설정
];

const SCREEN_FILES = [
  ...screenFiles(path.join(SRC, 'components')),
  ...screenFiles(path.join(SRC, 'pages')),
  'lib/tournament/display.ts',
].filter((file) => !COLOR_VALUE_ALLOWED.includes(file));

const COLOR_NAMES =
  'gray|slate|zinc|neutral|stone|blue|red|green|yellow|amber|orange|purple|pink|indigo|teal|lime|sky|emerald|cyan|violet|rose|fuchsia';
const COLOR_PREFIXES =
  'bg|text|border|ring|ring-offset|from|to|via|divide|placeholder|fill|stroke|outline|decoration|accent|caret|shadow';

// tsconfig의 target이 낮아 일부 정규식은 리터럴 대신 생성자를 쓴다.
const FORBIDDEN: Array<{ what: string; pattern: RegExp }> = [
  {
    what: 'Tailwind 기본 색',
    // 뒤에 숫자 단계가 붙은 것만 잡는다. 토큰(bg-neutral-soft)은 숫자가 없다.
    pattern: new RegExp(
      `\\b(?:${COLOR_PREFIXES})-(?:${COLOR_NAMES})-\\d{2,3}\\b`
    ),
  },
  {
    what: '흑백 직접 지정',
    pattern: /\b(?:bg|text|border|ring|divide)-(?:white|black)\b/,
  },
  { what: '그라디언트', pattern: /\bbg-gradient-/ },
  {
    what: '옛 그림자',
    // shadow, shadow-sm … 은 금지. 토큰인 shadow-overlay와 shadow-none만 허용.
    pattern: new RegExp(
      '(?<![\\w-])shadow(?:-(?:sm|md|lg|xl|2xl|inner))?(?![\\w-])'
    ),
  },
  { what: '색 값 (#hex)', pattern: /#[0-9a-fA-F]{3,8}\b/ },
  { what: '색 값 (rgb/hsl)', pattern: /\b(?:rgba?|hsla?)\(/ },
  {
    what: '이모지',
    pattern: new RegExp(
      '[\\u{1F000}-\\u{1FAFF}\\u{2300}-\\u{23FF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}]',
      'u'
    ),
  },
  {
    // 색을 한 줄씩 기계로 바꾸다 생긴 조합. 직접 만든 버튼 대신 Button 부품을 쓴다.
    what: '안 보이는 글자 조합',
    pattern:
      /\btext-on-accent\b.*\bdisabled:bg-fill\b|\bdisabled:bg-fill\b.*\btext-on-accent\b|\btext-primary\b.*\bhover:text-on-accent\b/,
  },
];

const violations = (line: string) =>
  FORBIDDEN.filter(({ pattern }) => pattern.test(line)).map(({ what }) => what);

describe('지킴이의 규칙 자체', () => {
  it.each([
    ['bg-gray-100', 'Tailwind 기본 색'],
    ['bg-neutral-500', 'Tailwind 기본 색'],
    ['text-fuchsia-600', 'Tailwind 기본 색'],
    ['outline-red-500', 'Tailwind 기본 색'],
    ['hover:bg-blue-50', 'Tailwind 기본 색'],
    ['text-white', '흑백 직접 지정'],
    ['bg-gradient-to-r', '그라디언트'],
    ['rounded shadow p-3', '옛 그림자'],
    ['shadow-md', '옛 그림자'],
    ['bg-[#fff]', '색 값 (#hex)'],
    ['color: #3b82f6', '색 값 (#hex)'],
    ['rgba(0, 0, 0, 0.5)', '색 값 (rgb/hsl)'],
    ['⏰ 시간', '이모지'],
    ['📅 날짜', '이모지'],
    ['🚗 주차', '이모지'],
    ['⭐', '이모지'],
    ['bg-accent text-on-accent disabled:bg-fill', '안 보이는 글자 조합'],
    ['px-1 text-primary hover:text-on-accent', '안 보이는 글자 조합'],
  ])('%s 를 잡는다', (line, what) => {
    expect(violations(line)).toContain(what);
  });

  it.each([
    'bg-neutral-soft text-neutral',
    'bg-positive-soft text-positive',
    'shadow-overlay',
    'bg-surface text-primary border-border',
    'divide-y-[0.5px] divide-separator',
    'text-large-title',
    'bg-accent text-on-accent disabled:opacity-40',
    '// 10월 4일 토요일 · 오후 7:00 – 10:00',
    'href={`/clubs/${clubId}/workouts/${workout.id}`}',
  ])('%s 는 잡지 않는다', (line) => {
    expect(violations(line)).toEqual([]);
  });
});

describe('모든 화면', () => {
  it('화면 파일을 빠짐없이 찾는다', () => {
    expect(SCREEN_FILES.length).toBeGreaterThan(100);
    expect(SCREEN_FILES).toContain('components/atoms/buttons/Button.tsx');
    expect(SCREEN_FILES).toContain('pages/clubs/[id]/members/index.tsx');
    expect(SCREEN_FILES.some((file) => file.startsWith('pages/api/'))).toBe(
      false
    );
  });

  it.each(SCREEN_FILES)('%s 에 옛 색·이모지·그라디언트가 없다', (file) => {
    const source = fs.readFileSync(path.join(SRC, file), 'utf8');
    const found: string[] = [];

    source.split('\n').forEach((line, index) => {
      for (const what of violations(line)) {
        found.push(`${index + 1}: ${what} — ${line.trim().slice(0, 80)}`);
      }
    });

    expect(found).toEqual([]);
  });
});

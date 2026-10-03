import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = path.resolve(__dirname, '../..');

/**
 * 새 디자인으로 옮긴 파일. 옮길 때마다 여기에 더한다.
 * 이 파일들에는 옛 색·이모지·그라디언트가 다시 들어오면 안 된다.
 */
const MIGRATED = [
  // 4단계 ① 출석체크 · 운동 상세
  'components/organisms/workout/WorkoutCard.tsx',
  'components/organisms/workout/WorkoutEditSheet.tsx',
  'components/organisms/workout/WorkoutDeleteSheet.tsx',
  'pages/clubs/[id]/attendance/index.tsx',
];

const COLOR_NAMES =
  'gray|slate|zinc|neutral-\\d|stone|blue|red|green|yellow|amber|orange|purple|pink|indigo|teal|lime|sky|emerald|cyan|violet|rose';

const FORBIDDEN: Array<{ what: string; pattern: RegExp }> = [
  {
    what: 'Tailwind 기본 색',
    pattern: new RegExp(
      `\\b(?:bg|text|border|ring|from|to|via|divide|placeholder|fill|stroke)-(?:${COLOR_NAMES})-\\d{2,3}\\b`
    ),
  },
  {
    what: '흑백 직접 지정',
    pattern: /\b(?:bg|text|border)-(?:white|black)\b/,
  },
  { what: '그라디언트', pattern: /\bbg-gradient-/ },
  { what: '옛 그림자', pattern: /\bshadow-(?:sm|md|lg|xl|2xl)\b/ },
  { what: '색 값', pattern: /#[0-9a-fA-F]{6}\b/ },
  {
    what: '이모지',
    // tsconfig의 target이 낮아 정규식 리터럴 대신 생성자를 쓴다.
    pattern: new RegExp('[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]', 'u'),
  },
];

describe('새 디자인으로 옮긴 화면', () => {
  it.each(MIGRATED)('%s 에 옛 색·이모지·그라디언트가 없다', (file) => {
    const source = fs.readFileSync(path.join(SRC, file), 'utf8');
    const found: string[] = [];

    source.split('\n').forEach((line, index) => {
      for (const { what, pattern } of FORBIDDEN) {
        if (pattern.test(line)) {
          found.push(`${index + 1}: ${what} — ${line.trim().slice(0, 80)}`);
        }
      }
    });

    expect(found).toEqual([]);
  });

  it('등록된 파일이 모두 실제로 있다', () => {
    const missing = MIGRATED.filter(
      (file) => !fs.existsSync(path.join(SRC, file))
    );
    expect(missing).toEqual([]);
  });
});

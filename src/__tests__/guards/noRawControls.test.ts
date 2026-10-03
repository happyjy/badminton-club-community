import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = path.join(process.cwd(), 'src');

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : tsxFiles(full);
    }
    return entry.name.endsWith('.tsx') && !entry.name.includes('.test.')
      ? [full]
      : [];
  });
}

// 부품으로 감싸지 않아도 되는 input 종류
const ALLOWED_INPUT_TYPES = ['radio', 'hidden', 'file'];

/** 부품을 쓰지 않고 직접 쓴 <input>·<select>·<textarea>의 위치 */
function findRawControls(dir: string): string[] {
  const found: string[] = [];

  for (const file of tsxFiles(dir)) {
    const rel = path.relative(SRC, file);
    // 부품 자신은 원시 요소를 쓴다.
    if (rel.startsWith(path.join('components', 'atoms'))) continue;

    const source = fs.readFileSync(file, 'utf8');
    const tagPattern = /<(input|select|textarea)\b([^>]*)>/g;
    for (const match of source.matchAll(tagPattern)) {
      const [, tag, attrs] = match;
      if (tag === 'input') {
        const type = /type=["']([a-z]+)["']/.exec(attrs)?.[1];
        if (type && ALLOWED_INPUT_TYPES.includes(type)) continue;
      }
      const line = source.slice(0, match.index).split('\n').length;
      found.push(`${rel}:${line} <${tag}>`);
    }
  }

  return found;
}

// 다른 단계에서 Sheet로 옮기기로 한 것 (계획 문서의 "제외" 표)
const OVERLAYS_MOVED_LATER = [
  'components/organisms/sheet/Sheet.tsx',
  'components/organisms/modal/join/JoinModal.tsx', // 4단계 게스트 신청 화면
  'components/organisms/modal/PrivacyModal.tsx', // 4단계 게스트 신청 화면
  'components/molecules/OptionBottomSheet.tsx', // 5단계 회원 관리
  'components/molecules/CircleMenu.tsx', // 4단계 운동 상세
  'components/organisms/navigation/mainNavigation/SideMenu.tsx', // 3단계 앱 뼈대
];

/** Sheet를 쓰지 않고 화면 전체를 덮는 막을 직접 만든 파일 */
function findHandMadeOverlays(dir: string): string[] {
  return tsxFiles(dir)
    .filter((file) => /\bfixed\s+inset-0\b/.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(SRC, file).split(path.sep).join('/'))
    .filter((rel) => !OVERLAYS_MOVED_LATER.includes(rel));
}

describe('원시 입력 요소', () => {
  it('대회 컴포넌트는 input·select·textarea를 직접 쓰지 않는다', () => {
    expect(
      findRawControls(path.join(SRC, 'components/organisms/tournament'))
    ).toEqual([]);
  });
});

describe('직접 만든 모달', () => {
  it('화면을 덮는 막은 Sheet만 만든다 (뒤 단계로 미룬 것 제외)', () => {
    expect(findHandMadeOverlays(SRC)).toEqual([]);
  });
});

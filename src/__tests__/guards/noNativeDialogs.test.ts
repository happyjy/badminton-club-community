import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = path.join(process.cwd(), 'src');

/** src 아래의 .ts/.tsx 파일 (테스트 제외) */
function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [full]
      : [];
  });
}

// 전역 confirm( / alert( / window.confirm( / window.alert( 호출.
// 앞이 글자·점이면 다른 것의 메서드나 이름의 일부다 (toast.alert, onConfirm( 등).
const NATIVE_DIALOG = /(?:^|[^\w.])(?:window\.)?(confirm|alert)\(/;

describe('브라우저 기본 확인창', () => {
  it('confirm()·alert()를 직접 부르지 않는다 (useConfirm을 쓴다)', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const usesHook = /const confirm = useConfirm\(\)/.test(
        fs.readFileSync(file, 'utf8')
      );
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
          const match = NATIVE_DIALOG.exec(code);
          if (!match) return;
          // useConfirm으로 만든 confirm은 허용한다. alert와 window.*는 언제나 금지.
          const isHookConfirm =
            usesHook && match[1] === 'confirm' && !/window\./.test(match[0]);
          if (!isHookConfirm) {
            offenders.push(`${path.relative(SRC, file)}:${index + 1}`);
          }
        });
    }

    expect(offenders).toEqual([]);
  });
});

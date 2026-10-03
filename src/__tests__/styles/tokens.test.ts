import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

import config from '../../../tailwind.config';

const css = fs.readFileSync(
  path.join(process.cwd(), 'src/styles/globals.css'),
  'utf8'
);

/** 설정 객체 안의 모든 문자열에서 var(--이름)을 모은다. */
function collectVars(value: unknown, out: Set<string>) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
      out.add(match[1]);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectVars(item, out));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectVars(item, out));
  }
}

describe('디자인 토큰', () => {
  it('tailwind 설정이 가리키는 CSS 변수는 모두 globals.css에 정의돼 있다', () => {
    const used = new Set<string>();
    collectVars(config.theme, used);

    expect(used.size).toBeGreaterThan(20);
    const missing = [...used].filter((name) => !css.includes(`${name}:`));
    expect(missing).toEqual([]);
  });

  it('글자 크기 토큰은 정해진 7단계다', () => {
    const fontSize = config.theme?.extend?.fontSize as Record<string, unknown>;

    expect(Object.keys(fontSize).sort()).toEqual(
      [
        'body',
        'callout',
        'caption',
        'footnote',
        'headline',
        'large-title',
        'title',
      ].sort()
    );
  });

  it('휴대폰 본문은 16px, compact 밀도의 본문은 14px다', () => {
    expect(css).toMatch(/--fs-body:\s*16px/);

    const compact = css.slice(css.indexOf("[data-density='compact']"));
    expect(compact).toMatch(/--fs-body:\s*14px/);
  });

  it('둥글기는 8 · 12 · 16이다', () => {
    expect(config.theme?.extend?.borderRadius).toEqual({
      sm: '8px',
      md: 'var(--radius-md)',
      lg: '16px',
    });
    expect(css).toMatch(/--radius-md:\s*12px/);
  });

  it('PC 관리 화면(compact 밀도)에서는 묶음·입력칸의 둥글기가 8이다', () => {
    const compact = css.slice(css.indexOf("[data-density='compact']"));
    expect(compact).toMatch(/--radius-md:\s*8px/);
  });

  it('날짜·시간 입력칸은 아이폰에서도 다른 입력칸과 폭이 같다 (고유 폭으로 삐져나오지 않는다)', () => {
    const rule = /input\[type='date'\][^{]*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(css).toMatch(/input\[type='time'\]/);
    expect(css).toMatch(/input\[type='datetime-local'\]/);
    // 아이폰 Safari는 기본 모양일 때 width: 100%를 무시한다.
    expect(rule).toMatch(/-webkit-appearance:\s*none/);
    expect(rule).toMatch(/min-width:\s*0/);
    expect(rule).toMatch(/max-width:\s*100%/);
    // 아이폰은 날짜 글자를 가운데에 둔다. 다른 칸처럼 왼쪽에 맞춘다.
    expect(css).toMatch(
      /::-webkit-date-and-time-value\s*\{[^}]*text-align:\s*left/
    );
  });
});

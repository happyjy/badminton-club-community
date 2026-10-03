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
      md: '12px',
      lg: '16px',
    });
  });
});

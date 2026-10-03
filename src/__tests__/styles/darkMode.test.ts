import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

const css = fs.readFileSync(
  path.join(process.cwd(), 'src/styles/globals.css'),
  'utf8'
);

/** `{`부터 짝이 맞는 `}`까지의 안쪽 글자 */
function blockAfter(source: string, from: number): string {
  const open = source.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error('닫는 괄호가 없다');
}

function colorVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const match of block.matchAll(/(--color-[a-z0-9-]+):\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

const light = colorVars(blockAfter(css, css.indexOf(':root')));
const darkMedia = css.indexOf('@media (prefers-color-scheme: dark)');
const dark = darkMedia === -1 ? {} : colorVars(blockAfter(css, darkMedia));
/** 다크에서 따로 정하지 않은 값은 라이트 값을 그대로 쓴다. */
const darkResolved = { ...light, ...dark };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [글자, 바탕, 최소 대비]. 본문은 4.5, 보조 안내(tertiary)와 큰 글자는 3.
const PAIRS: Array<[string, string, number]> = [
  ['--color-text', '--color-bg', 4.5],
  ['--color-text', '--color-surface', 4.5],
  ['--color-text', '--color-fill', 4.5],
  ['--color-text', '--color-raised', 4.5],
  ['--color-text-secondary', '--color-bg', 4.5],
  ['--color-text-secondary', '--color-surface', 4.5],
  ['--color-text-secondary', '--color-fill', 4.5],
  ['--color-text-tertiary', '--color-surface', 3],
  ['--color-on-accent', '--color-accent', 4.5],
  ['--color-positive', '--color-positive-soft', 4.5],
  ['--color-warning', '--color-warning-soft', 4.5],
  ['--color-negative', '--color-negative-soft', 4.5],
  ['--color-neutral', '--color-neutral-soft', 4.5],
  ['--color-negative', '--color-surface', 4.5],
  ['--color-on-kakao', '--color-kakao', 4.5],
  ...[1, 2, 3, 4, 5, 6].map((n): [string, string, number] => [
    '--color-on-avatar',
    `--color-avatar-${n}`,
    4.5,
  ]),
];

describe('다크모드 토큰', () => {
  it('시스템 설정이 다크일 때 쓰는 색 블록이 있다', () => {
    expect(darkMedia).toBeGreaterThan(-1);
    expect(Object.keys(dark).length).toBeGreaterThan(15);
  });

  it('다크 블록은 라이트에 있는 이름만 다시 정한다 (오타 방지)', () => {
    const unknown = Object.keys(dark).filter((name) => !(name in light));
    expect(unknown).toEqual([]);
  });

  it('바탕·글자·강조·상태색은 다크 값이 따로 있다', () => {
    const required = [
      'bg',
      'surface',
      'surface-muted',
      'fill',
      'raised',
      'text',
      'text-secondary',
      'text-tertiary',
      'separator',
      'border',
      'accent',
      'on-accent',
      'scrim',
      'tabbar',
      'positive',
      'positive-soft',
      'warning',
      'warning-soft',
      'negative',
      'negative-soft',
      'neutral',
      'neutral-soft',
    ].map((name) => `--color-${name}`);

    expect(required.filter((name) => !(name in dark))).toEqual([]);
  });

  it('카카오 버튼과 아바타의 글자색은 강조색을 따라 뒤집히지 않는다', () => {
    expect(light['--color-on-kakao']).toBeDefined();
    expect(light['--color-on-avatar']).toBeDefined();
    expect(dark['--color-kakao']).toBeUndefined();
    expect(dark['--color-on-kakao']).toBeUndefined();
    expect(dark['--color-on-avatar']).toBeUndefined();
  });

  it.each(PAIRS)('라이트: %s / %s 대비가 %d 이상', (text, bg, min) => {
    expect(contrast(light[text], light[bg])).toBeGreaterThanOrEqual(min);
  });

  it.each(PAIRS)('다크: %s / %s 대비가 %d 이상', (text, bg, min) => {
    expect(
      contrast(darkResolved[text], darkResolved[bg])
    ).toBeGreaterThanOrEqual(min);
  });

  it('다크에서는 바탕이 어둡고 글자가 밝다', () => {
    expect(luminance(darkResolved['--color-bg'])).toBeLessThan(0.05);
    expect(luminance(darkResolved['--color-surface'])).toBeLessThan(0.05);
    expect(luminance(darkResolved['--color-text'])).toBeGreaterThan(0.7);
  });

  it('브라우저 기본 부품(날짜 입력, 스크롤바)도 따라 바뀌도록 color-scheme을 알린다', () => {
    expect(css).toMatch(/color-scheme:\s*light dark/);
  });

  it('Select 화살표는 다크에서 밝은 색으로 바뀐다', () => {
    // 화살표는 components 층에 있는 두 번째 다크 블록에 있다.
    const block = blockAfter(
      css,
      css.lastIndexOf('@media (prefers-color-scheme: dark)')
    );
    expect(block).toMatch(/\.select-chevron\s*\{[^}]*background-image/);
  });

  it('고른 구분 버튼(raised)은 다크에서 받침(fill)보다 밝다', () => {
    expect(luminance(darkResolved['--color-raised'])).toBeGreaterThan(
      luminance(darkResolved['--color-fill'])
    );
    expect(luminance(light['--color-raised'])).toBeGreaterThan(
      luminance(light['--color-fill'])
    );
  });

  it('다크 값은 라이트 값과 같은 층(base)에서 라이트 뒤에 온다 (뒤에 와야 이긴다)', () => {
    const lightAt = css.search(/^\s*:root\s*\{/m);
    const componentsAt = css.indexOf('@layer components');
    expect(lightAt).toBeGreaterThan(-1);
    expect(darkMedia).toBeGreaterThan(lightAt);
    expect(darkMedia).toBeLessThan(componentsAt);
  });
});

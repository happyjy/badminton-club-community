# 디자인 시스템 기반 (토큰 + 기본 부품) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설계 문서의 토큰(색·글자·둥글기·쌓임 순서)을 코드에 정의하고, 그 토큰만 쓰는 기본 부품 한 벌을 만든다.

**Architecture:** 토큰은 `globals.css`의 CSS 변수가 원본이고 `tailwind.config.ts`가 그 변수에 이름을 붙인다. 부품은 Tailwind 토큰 클래스만 쓰고 `cva`로 변형을, `cn`(tailwind-merge)으로 호출부의 className 덮어쓰기를 처리한다. 떠 있는 창(Sheet)의 동작은 `@headlessui/react`의 `Dialog`에 맡긴다.

**Tech Stack:** Next.js 15 (pages router) · React 19 · Tailwind CSS 3.4 · class-variance-authority 0.7 · tailwind-merge 3.3 · @headlessui/react 2.2 · lucide-react · Jest 30 + @testing-library/react 16 · Pretendard 1.3.9

**Spec:** `docs/superpowers/specs/2026-10-03-design-system-design.md` (3장 토큰, 4-1 공통 부품, 7장의 1–2단계)

## 이 계획의 범위

| 포함 | 제외 (다음 계획) |
| --- | --- |
| 1단계 전부: 토큰, Pretendard, `statusTone`, 정의 없이 쓰이던 클래스 정리 | 원시 `<input>`·`<select>` 58곳을 부품으로 교체 |
| 2단계 중 **부품 만들기**: 기존 atom 6개 고치기, 새 부품 9개 | `confirm()`·`alert()` 호출부를 `useConfirm`으로 교체 |
| `Button` 변형 이름 바꾸기에 따른 호출부 수정 (타입이 깨지므로 같이 한다) | 기존 모달·시트를 `Sheet`로 이전, `GuestAvatar`→`Avatar` 교체 |
| 부품을 한눈에 보는 개발용 화면 `/dev/ui-kit` | `PageHeader`·탭바·사이드바 (3단계) |

## Global Constraints

- 부품에는 색 값(`#3b82f6`)과 Tailwind 기본 색 이름(`gray-500`, `blue-600`)을 쓰지 않는다. 3장의 토큰 클래스만 쓴다 (설계 P6).
- 토큰 색에는 투명도 수식(`bg-accent/50`)을 쓰지 않는다. CSS 변수라 동작하지 않는다. 눌림·비활성 표현은 `opacity-*`로 한다.
- 글자 크기는 7단계 토큰(`text-large-title` `text-title` `text-headline` `text-body` `text-callout` `text-footnote` `text-caption`)만 쓴다.
- 누를 수 있는 요소의 터치 영역은 44 × 44 이상. 입력 요소의 글자는 16px 이상(`text-body`).
- 클래스 합치기는 반드시 `cn()`(`@/lib/utils`)을 쓴다. 문자열 이어 붙이기 금지.
- 아이콘은 `lucide-react`만 쓴다.
- 테스트는 `@jest/globals`에서 `describe/expect/it/jest`를 가져온다. `@testing-library/jest-dom` 매처(`toBeInTheDocument` 등)는 **쓰지 않는다** — 이 레포에서 타입이 깨진다(`jest.setup.dom.js` 주석 참고). `toBeTruthy()`, `.getAttribute()`, `.className`으로 검증한다.
- 렌더링 테스트 파일 이름은 `*.dom.test.tsx`(jsdom), 순수 로직은 `*.test.ts`(node).
- 검증 명령: 매 과제 `npx tsc --noEmit` + 해당 테스트. `npm run build`는 Task 1과 마지막 Task에서만.
- DB를 건드리지 않는다. `prisma` 명령을 실행하지 않는다.
- 커밋 메시지는 한국어, 형식 `feat(ui): …` / `refactor(ui): …`. **`Co-Authored-By` 등 AI 도구 서명을 넣지 않는다.**
- 작업 브랜치: `feat/design-system-foundation` (`main`에 직접 커밋하지 않는다).

## Review Focus

설계에는 적혀 있지 않지만 실제로 쓰다 보면 부딪힐 가능성이 높은 것들. 각 항목의 테스트는 괄호 안의 과제에 들어 있다.

1. **호출부가 `className`으로 크기·색을 덮어쓴다** — 지금 코드에 이미 그런 호출이 많다. 덮어쓴 쪽이 이겨야 하고, 동시에 `text-body`(크기)와 `text-secondary`(색)처럼 접두어가 같은 토큰은 둘 다 살아남아야 한다. (Task 2, Task 4)
2. **모르는 상태값·빈 상태값** — DB의 `status`는 대부분 `String`이라 새 값이 들어올 수 있다. 칩은 회색으로 그려져야 하고 오류가 나면 안 된다. (Task 3, Task 8)
3. **`FormField` 안에 입력이 하나가 아니다** — 전화번호 3칸처럼 여러 요소를 감싼 `<div>`, Fragment, 문자열이 올 수 있다. 경고나 오류 없이 그려져야 한다. (Task 7)
4. **아바타 사진 주소가 깨졌거나 이름이 비었다** — 카카오 프로필 주소는 만료된다. 깨진 그림 아이콘 대신 이름 첫 글자가 보여야 한다. (Task 9)
5. **확인창이 떠 있는 동안 `confirm()`이 또 불린다 / ESC로 닫는다** — 먼저 뜬 쪽의 Promise가 영원히 끝나지 않으면 버튼이 멈춘 채 남는다. 둘 다 `false`로 끝나야 한다. (Task 13)

---

## File Structure

| 파일 | 역할 | 과제 |
| --- | --- | --- |
| `src/styles/globals.css` (수정) | 토큰 CSS 변수의 원본. 밀도(compact) 전환, select 화살표 | 1, 6 |
| `tailwind.config.ts` (수정) | CSS 변수에 Tailwind 이름 붙이기 | 1 |
| `src/pages/_app.tsx` (수정) | Pretendard 불러오기, `ConfirmProvider` 감싸기 | 1, 13 |
| `src/lib/utils.ts` (수정) | `cn`이 글자 크기 토큰을 알게 한다 | 2 |
| `src/constants/statusTone.ts` (신규) | 도메인 상태 → 톤. 유일한 대응표 | 3 |
| `src/components/atoms/buttons/Button.tsx` (수정) | 버튼 | 4 |
| `src/components/atoms/buttons/IconButton.tsx` (신규) | 아이콘 버튼 | 5 |
| `src/components/atoms/inputs/{Input,Select,Checkbox}.tsx`, `src/components/atoms/Textarea.tsx` (수정) | 입력 | 6 |
| `src/components/atoms/labels/Label.tsx`, `src/components/molecules/form/FormField.tsx` (수정) | 라벨과 입력 연결 | 7 |
| `src/components/atoms/StatusChip.tsx` (신규) | 상태 칩 | 8 |
| `src/components/atoms/Avatar.tsx` (신규) | 프로필 사진 / 첫 글자 | 9 |
| `src/components/molecules/list/{ListGroup,ListRow}.tsx` (신규) | iOS식 묶음 리스트 | 10 |
| `src/components/molecules/SegmentedControl.tsx` (신규) | 2–4개 중 하나 고르기 | 11 |
| `src/components/organisms/sheet/Sheet.tsx` (신규) | 시트 / 모달 | 12 |
| `src/components/organisms/sheet/ConfirmProvider.tsx` (신규) | `useConfirm()` | 13 |
| `src/components/molecules/EmptyState.tsx`, `src/components/atoms/Skeleton.tsx` (신규) | 빈 화면, 불러오는 중 | 14 |
| `src/pages/dev/ui-kit.tsx` (신규), `next-sitemap.config.js` (수정) | 부품 미리보기 (개발 전용) | 15 |
| `jest.setup.dom.js` (수정) | headlessui가 jsdom에서 필요로 하는 브라우저 API 채우기 | 12 |
| `src/__tests__/…` | 과제마다 테스트 파일 하나 | 전부 |

---

### Task 1: 토큰 정의와 Pretendard

**Files:**
- Modify: `src/styles/globals.css:1-13`
- Modify: `tailwind.config.ts` (전체 교체)
- Modify: `src/pages/_app.tsx:1`
- Modify: `package.json` (`pretendard` 추가)
- Test: `src/__tests__/styles/tokens.test.ts`

**Interfaces:**
- Produces (이후 모든 과제가 쓰는 Tailwind 클래스):
  - 색: `bg-bg` `bg-surface` `bg-surface-muted` `bg-fill` `bg-accent` `bg-scrim` `text-on-accent` `border-border` `divide-separator` `ring-accent` `accent-accent`
  - 글자색: `text-primary` `text-secondary` `text-tertiary`
  - 상태색: `bg-{positive|warning|negative|neutral}-soft`, `text-{positive|warning|negative|neutral}`
  - 아바타: `bg-avatar-1` … `bg-avatar-6`
  - 글자 크기: `text-large-title` `text-title` `text-headline` `text-body` `text-callout` `text-footnote` `text-caption`
  - 둥글기: `rounded-sm`(8) `rounded-md`(12) `rounded-lg`(16) `rounded-full`
  - 그 밖: `shadow-overlay`, `z-tabbar` `z-dropdown` `z-sheet` `z-toast`
  - 밀도: 조상에 `data-density="compact"`가 있고 폭이 1024px 이상이면 글자 크기 변수가 PC 관리 값으로 바뀐다

> **눈에 보이는 변화 (의도된 것):** 글꼴이 Pretendard로, 화면 바탕이 연회색(`#F2F2F7`)으로 바뀐다. `rounded-sm/md/lg`의 값이 2/6/8px에서 8/12/16px로 커지므로 **기존 화면의 모서리도 함께 둥글어진다.**

- [ ] **Step 1: 브랜치 만들기**

```bash
git switch -c feat/design-system-foundation
```

- [ ] **Step 2: Pretendard 설치하고 파일 경로 확인**

```bash
npm install pretendard@1.3.9
ls node_modules/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css
```

Expected: 파일 경로가 그대로 출력된다. `No such file`이면 `ls node_modules/pretendard/dist/web/variable/`로 실제 파일 이름을 확인하고 Step 6의 import 경로를 그 이름으로 바꾼다.

- [ ] **Step 3: 실패하는 테스트 작성**

`src/__tests__/styles/tokens.test.ts`:

```ts
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
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/styles/tokens.test.ts`
Expected: FAIL — 첫 테스트에서 `expect(used.size).toBeGreaterThan(20)` (지금 설정에는 변수가 2개뿐이다).

- [ ] **Step 5: `globals.css` 머리 부분 교체**

`src/styles/globals.css`의 1–13행(`@tailwind base;`부터 `body { … }` 블록 끝까지)을 아래로 바꾼다. 14행 이후의 react-datepicker 스타일은 그대로 둔다.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* 색 — 역할 이름. 다크모드를 넣을 때는 이 블록의 값만 바꾼다. */
    --color-bg: #f2f2f7;
    --color-surface: #ffffff;
    --color-surface-muted: #fafafb;
    --color-fill: #e5e5ea;
    --color-text: #1c1c1e;
    --color-text-secondary: #636366;
    --color-text-tertiary: #8e8e93;
    --color-separator: #c6c6c8;
    --color-border: #e5e5ea;
    --color-accent: #1c1c1e;
    --color-on-accent: #ffffff;
    --color-scrim: rgba(0, 0, 0, 0.4);

    /* 상태색 — soft는 칩 배경, 이름만 있는 쪽은 글자 */
    --color-positive: #176b34;
    --color-positive-soft: #e3f5e8;
    --color-warning: #8a5a00;
    --color-warning-soft: #fff2d9;
    --color-negative: #b3261e;
    --color-negative-soft: #fde7e5;
    --color-neutral: #636366;
    --color-neutral-soft: #efeff2;

    /* 사진이 없는 아바타의 바탕 */
    --color-avatar-1: #5f6f8f;
    --color-avatar-2: #7a6296;
    --color-avatar-3: #4f7a5c;
    --color-avatar-4: #96605b;
    --color-avatar-5: #4e7a96;
    --color-avatar-6: #857040;

    /* 글자 크기 / 줄 높이 — 휴대폰 기준 */
    --fs-large-title: 28px;
    --lh-large-title: 34px;
    --fs-title: 22px;
    --lh-title: 28px;
    --fs-headline: 17px;
    --lh-headline: 24px;
    --fs-body: 16px;
    --lh-body: 24px;
    --fs-callout: 15px;
    --lh-callout: 22px;
    --fs-footnote: 13px;
    --lh-footnote: 18px;
    --fs-caption: 12px;
    --lh-caption: 16px;
  }

  /* PC 관리 화면: 본문 영역에 data-density="compact"를 달면 한 단계 작아진다. */
  @media (min-width: 1024px) {
    [data-density='compact'] {
      --fs-large-title: 24px;
      --lh-large-title: 30px;
      --fs-title: 20px;
      --lh-title: 26px;
      --fs-headline: 15px;
      --lh-headline: 22px;
      --fs-body: 14px;
      --lh-body: 20px;
      --fs-callout: 14px;
      --lh-callout: 20px;
    }
  }

  body {
    color: var(--color-text);
    background: var(--color-bg);
    -webkit-font-smoothing: antialiased;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    ::before,
    ::after {
      transition-duration: 0.01ms !important;
    }
  }
}
```

- [ ] **Step 6: `tailwind.config.ts` 전체 교체**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          '"Malgun Gothic"',
          'sans-serif',
        ],
      },
      // 값의 원본은 src/styles/globals.css의 :root다.
      colors: {
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
        },
        fill: 'var(--color-fill)',
        separator: 'var(--color-separator)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
        'on-accent': 'var(--color-on-accent)',
        scrim: 'var(--color-scrim)',
        positive: {
          DEFAULT: 'var(--color-positive)',
          soft: 'var(--color-positive-soft)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
        },
        negative: {
          DEFAULT: 'var(--color-negative)',
          soft: 'var(--color-negative-soft)',
        },
        neutral: {
          DEFAULT: 'var(--color-neutral)',
          soft: 'var(--color-neutral-soft)',
        },
        avatar: {
          1: 'var(--color-avatar-1)',
          2: 'var(--color-avatar-2)',
          3: 'var(--color-avatar-3)',
          4: 'var(--color-avatar-4)',
          5: 'var(--color-avatar-5)',
          6: 'var(--color-avatar-6)',
        },
      },
      textColor: {
        primary: 'var(--color-text)',
        secondary: 'var(--color-text-secondary)',
        tertiary: 'var(--color-text-tertiary)',
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
      },
      fontSize: {
        'large-title': [
          'var(--fs-large-title)',
          {
            lineHeight: 'var(--lh-large-title)',
            letterSpacing: '-0.02em',
            fontWeight: '700',
          },
        ],
        title: [
          'var(--fs-title)',
          {
            lineHeight: 'var(--lh-title)',
            letterSpacing: '-0.02em',
            fontWeight: '700',
          },
        ],
        headline: [
          'var(--fs-headline)',
          {
            lineHeight: 'var(--lh-headline)',
            letterSpacing: '-0.01em',
            fontWeight: '600',
          },
        ],
        body: [
          'var(--fs-body)',
          { lineHeight: 'var(--lh-body)', fontWeight: '400' },
        ],
        callout: [
          'var(--fs-callout)',
          { lineHeight: 'var(--lh-callout)', fontWeight: '400' },
        ],
        footnote: [
          'var(--fs-footnote)',
          { lineHeight: 'var(--lh-footnote)', fontWeight: '400' },
        ],
        caption: [
          'var(--fs-caption)',
          { lineHeight: 'var(--lh-caption)', fontWeight: '500' },
        ],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
      boxShadow: {
        overlay: '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
      zIndex: {
        tabbar: '30',
        dropdown: '40',
        sheet: '50',
        toast: '60',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
```

기존의 `colors.background` / `colors.foreground`(정의되지 않은 `--background` 변수를 가리키던 것)는 없앤다. 이 이름을 쓰던 클래스는 Task 2에서 바꾼다.

- [ ] **Step 7: `_app.tsx`에서 Pretendard 불러오기**

`src/pages/_app.tsx`의 첫 줄을 아래 두 줄로 바꾼다. 글꼴이 먼저 와야 `globals.css`가 뒤에서 덮어쓸 수 있다.

```ts
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@/styles/globals.css';
```

- [ ] **Step 8: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/styles/tokens.test.ts`
Expected: PASS (4개)

- [ ] **Step 9: 타입 검사와 빌드**

Run: `npx tsc --noEmit && npm run build`
Expected: 둘 다 오류 없이 끝난다. 빌드 중 `bg-background` 관련 경고가 나와도 Task 2에서 고치므로 넘어간다.

- [ ] **Step 10: 눈으로 확인**

Run: `npm run dev` 후 브라우저에서 `http://localhost:3000` 열기.
확인: ① 바탕이 연회색 ② 개발자 도구의 Computed → `font-family`가 `Pretendard Variable`로 시작 ③ Network 탭에 `woff2` 요청이 여러 조각으로 나뉘어 있다.

- [ ] **Step 11: 커밋**

```bash
git add package.json package-lock.json tailwind.config.ts src/styles/globals.css src/pages/_app.tsx src/__tests__/styles/tokens.test.ts
git commit -m "feat(ui): 디자인 토큰과 Pretendard 글꼴 추가"
```

---

### Task 2: `cn`에 글자 크기 토큰 알리기, 정의 없던 클래스 정리

**Files:**
- Modify: `src/lib/utils.ts:1-6`
- Modify: `src/components/organisms/forms/{WorkoutScheduleForm,ClubHomeSettingsForm,GuestPageSettingsForm,EmailSettingsForm,SmsSettingsForm}.tsx`
- Test: `src/__tests__/lib/cn.test.ts`

**Interfaces:**
- Consumes: Task 1의 토큰 클래스
- Produces: `cn(...inputs: ClassValue[]): string` — 시그니처는 그대로. 글자 크기 토큰끼리는 뒤의 것이 이기고, 글자 크기 토큰과 글자색 토큰은 함께 남는다.

**배경:** tailwind-merge는 `text-…`가 크기인지 색인지를 이름으로 구분한다. `text-body`는 모르는 이름이라 색으로 취급되어 `cn('text-body', 'text-secondary')`에서 `text-body`가 지워진다. 토큰 이름을 알려 줘야 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/lib/cn.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('글자 크기 토큰과 글자색 토큰은 함께 남는다', () => {
    expect(cn('text-body', 'text-secondary')).toBe('text-body text-secondary');
  });

  it('글자 크기 토큰끼리는 뒤의 것이 이긴다', () => {
    expect(cn('text-body', 'text-footnote')).toBe('text-footnote');
  });

  it('글자 크기 토큰은 Tailwind 기본 크기와도 겨룬다', () => {
    expect(cn('text-body', 'text-sm')).toBe('text-sm');
  });

  it('글자색 토큰끼리는 뒤의 것이 이긴다', () => {
    expect(cn('text-primary', 'text-negative')).toBe('text-negative');
  });

  it('높이·배경처럼 원래 알던 것은 그대로 겨룬다', () => {
    expect(cn('h-11 bg-accent', 'h-8 bg-fill')).toBe('h-8 bg-fill');
  });

  it('거짓 값은 버린다', () => {
    expect(cn('h-11', false, undefined, null, '')).toBe('h-11');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/lib/cn.test.ts`
Expected: FAIL — 첫 테스트가 `text-secondary`만 돌려받는다.

- [ ] **Step 3: `cn` 고치기**

`src/lib/utils.ts`의 1–6행(import 두 줄과 `cn` 함수)을 아래로 바꾼다. 그 아래의 `formatDate` 등은 그대로 둔다.

```ts
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
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/lib/cn.test.ts`
Expected: PASS (6개)

- [ ] **Step 5: 정의 없이 쓰이던 클래스를 토큰으로 바꾸기**

설정 폼 5개가 `border-input`·`bg-background`·`ring-ring`·`ring-offset-background`·`text-muted-foreground`를 쓰는데, 이 이름들은 어디에도 정의된 적이 없어 스타일이 적용되지 않고 있었다. 토큰으로 바꾼다. 순서가 중요하다(`placeholder:`가 붙은 것을 먼저).

```bash
cd src/components/organisms/forms
sed -i '' \
  -e 's/placeholder:text-muted-foreground/placeholder:text-tertiary/g' \
  -e 's/text-muted-foreground/text-secondary/g' \
  -e 's/ring-offset-background/ring-offset-surface/g' \
  -e 's/bg-background/bg-surface/g' \
  -e 's/border-input/border-border/g' \
  -e 's/ring-ring/ring-accent/g' \
  WorkoutScheduleForm.tsx ClubHomeSettingsForm.tsx GuestPageSettingsForm.tsx EmailSettingsForm.tsx SmsSettingsForm.tsx
cd -
```

(`sed -i ''`는 macOS용이다. Linux에서는 `sed -i`.)

- [ ] **Step 6: 남은 것이 없는지 확인**

Run: `grep -rnE "border-input|bg-background|ring-ring|ring-offset-background|muted-foreground|text-foreground" src --include='*.tsx' --include='*.ts'`
Expected: 출력 없음.

- [ ] **Step 7: 타입 검사와 전체 테스트**

Run: `npx tsc --noEmit && npx jest`
Expected: 오류 없음, 기존 테스트 포함 전부 PASS.

- [ ] **Step 8: 커밋**

```bash
git add src/lib/utils.ts src/__tests__/lib/cn.test.ts src/components/organisms/forms
git commit -m "refactor(ui): cn이 글자 크기 토큰을 구분하게 하고 정의 없던 클래스를 토큰으로 교체"
```

---

### Task 3: 상태 → 톤 대응표

**Files:**
- Create: `src/constants/statusTone.ts`
- Test: `src/__tests__/constants/statusTone.test.ts`

**Interfaces:**
- Produces:
  - `type Tone = 'positive' | 'warning' | 'negative' | 'neutral'`
  - `type StatusDomain = 'guest' | 'member' | 'participation' | 'entryPayment' | 'entryEvent' | 'tournament' | 'feeRecord'`
  - `statusTone(domain: StatusDomain, status: string | null | undefined): Tone`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/constants/statusTone.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { statusTone } from '@/constants/statusTone';

describe('statusTone', () => {
  it('게스트 신청: 대기는 주의, 승인은 긍정, 거절은 부정', () => {
    expect(statusTone('guest', 'PENDING')).toBe('warning');
    expect(statusTone('guest', 'APPROVED')).toBe('positive');
    expect(statusTone('guest', 'REJECTED')).toBe('negative');
  });

  it('회원: 활동 중은 중립이라 회비 상태가 더 눈에 띈다', () => {
    expect(statusTone('member', 'APPROVED')).toBe('neutral');
    expect(statusTone('member', 'PENDING')).toBe('warning');
    expect(statusTone('member', 'REJECTED')).toBe('negative');
    expect(statusTone('member', 'ON_LEAVE')).toBe('neutral');
    expect(statusTone('member', 'LEFT')).toBe('neutral');
  });

  it('운동 참가: 확정은 긍정, 대기 명단은 주의', () => {
    expect(statusTone('participation', 'CONFIRMED')).toBe('positive');
    expect(statusTone('participation', 'WAITLIST')).toBe('warning');
  });

  it('대회: 모집 중은 긍정, 임시저장·마감은 중립', () => {
    expect(statusTone('tournament', 'OPEN')).toBe('positive');
    expect(statusTone('tournament', 'DRAFT')).toBe('neutral');
    expect(statusTone('tournament', 'CLOSED')).toBe('neutral');
  });

  it('대회 입금·종목', () => {
    expect(statusTone('entryPayment', 'PENDING')).toBe('warning');
    expect(statusTone('entryPayment', 'CONFIRMED')).toBe('positive');
    expect(statusTone('entryPayment', 'CANCELED')).toBe('negative');
    expect(statusTone('entryEvent', 'ACTIVE')).toBe('positive');
    expect(statusTone('entryEvent', 'CANCELED')).toBe('negative');
  });

  it('회비 기록', () => {
    expect(statusTone('feeRecord', 'PENDING')).toBe('warning');
    expect(statusTone('feeRecord', 'MATCHED')).toBe('positive');
    expect(statusTone('feeRecord', 'CONFIRMED')).toBe('positive');
    expect(statusTone('feeRecord', 'ERROR')).toBe('negative');
    expect(statusTone('feeRecord', 'SKIPPED')).toBe('neutral');
  });

  it('모르는 상태값은 중립이다', () => {
    expect(statusTone('guest', 'SOMETHING_NEW')).toBe('neutral');
  });

  it('상태가 비어 있어도 중립이다', () => {
    expect(statusTone('guest', null)).toBe('neutral');
    expect(statusTone('guest', undefined)).toBe('neutral');
    expect(statusTone('guest', '')).toBe('neutral');
  });

  it('객체의 기본 속성 이름이 상태로 들어와도 중립이다', () => {
    expect(statusTone('guest', 'constructor')).toBe('neutral');
    expect(statusTone('guest', 'toString')).toBe('neutral');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/constants/statusTone.test.ts`
Expected: FAIL — `Cannot find module '@/constants/statusTone'`

- [ ] **Step 3: 구현**

`src/constants/statusTone.ts`:

```ts
/**
 * 도메인 상태 → 상태색 톤. 이 대응은 여기서만 정한다.
 * 화면에서 `status === 'APPROVED' ? … : …`로 색을 고르지 않는다.
 *
 * 값의 출처: prisma/schema/enums.prisma, membershipFee.prisma,
 * workout.prisma(참가 status), src/types/enums.ts(회원 Status).
 */
export type Tone = 'positive' | 'warning' | 'negative' | 'neutral';

export type StatusDomain =
  | 'guest'
  | 'member'
  | 'participation'
  | 'entryPayment'
  | 'entryEvent'
  | 'tournament'
  | 'feeRecord';

const TONES: Record<StatusDomain, Record<string, Tone>> = {
  guest: {
    PENDING: 'warning',
    APPROVED: 'positive',
    REJECTED: 'negative',
  },
  // 활동 중(APPROVED)을 초록으로 하면 회원 445명 목록이 온통 초록이 된다.
  member: {
    PENDING: 'warning',
    APPROVED: 'neutral',
    ON_LEAVE: 'neutral',
    REJECTED: 'negative',
    LEFT: 'neutral',
  },
  participation: {
    CONFIRMED: 'positive',
    WAITLIST: 'warning',
  },
  entryPayment: {
    PENDING: 'warning',
    CONFIRMED: 'positive',
    CANCELED: 'negative',
  },
  entryEvent: {
    ACTIVE: 'positive',
    CANCELED: 'negative',
  },
  tournament: {
    DRAFT: 'neutral',
    OPEN: 'positive',
    CLOSED: 'neutral',
  },
  feeRecord: {
    PENDING: 'warning',
    MATCHED: 'positive',
    CONFIRMED: 'positive',
    ERROR: 'negative',
    SKIPPED: 'neutral',
  },
};

export function statusTone(
  domain: StatusDomain,
  status: string | null | undefined
): Tone {
  if (!status) return 'neutral';

  const tones = TONES[domain];
  // 'constructor' 같은 상속 속성이 걸리지 않게 자기 속성만 본다.
  return Object.prototype.hasOwnProperty.call(tones, status)
    ? tones[status]
    : 'neutral';
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/constants/statusTone.test.ts`
Expected: PASS (9개)

- [ ] **Step 5: 커밋**

```bash
git add src/constants/statusTone.ts src/__tests__/constants/statusTone.test.ts
git commit -m "feat(ui): 도메인 상태를 상태색 톤으로 바꾸는 대응표 추가"
```

---

### Task 4: Button

**Files:**
- Modify: `src/components/atoms/buttons/Button.tsx` (전체 교체)
- Modify: `variant="ghost" | "outline" | "default"`를 쓰는 호출부 (Step 5의 명령으로 찾는다)
- Test: `src/__tests__/components/ui/Button.dom.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), `Spinner` (`@/components/atoms/Spinner`, 기존)
- Produces:
  - `Button` — props: `ButtonHTMLAttributes<HTMLButtonElement>` + `variant?: 'primary' | 'secondary' | 'destructive' | 'plain'`(기본 `primary`) + `size?: 'lg' | 'md' | 'sm'`(기본 `md`) + `pending?: boolean` + `pendingText?: string` + `pendingPosition?: 'left' | 'right' | 'center'`
  - `buttonVariants` — 같은 모양을 `<Link>`에 입힐 때 쓰는 cva 함수
  - named export와 default export 둘 다 유지한다 (기존 import를 깨지 않기 위해)

**변형 이름 대응:**

| 예전 | 새 이름 | 모양 |
| --- | --- | --- |
| (생략) · `default` · `primary` | `primary` | 검정 바탕 + 흰 글자 |
| `secondary` · `outline` | `secondary` | 연회색 바탕 + 검정 글자 |
| `ghost` | `plain` | 바탕 없음 + 검정 글자 |
| (없음) | `destructive` | 연회색 바탕 + 빨강 글자 |

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/Button.dom.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { Button } from '@/components/atoms/buttons/Button';

describe('Button', () => {
  it('기본은 검정 주 버튼, 높이 44', () => {
    render(<Button>참석하기</Button>);

    const button = screen.getByRole('button', { name: '참석하기' });
    expect(button.className).toContain('bg-accent');
    expect(button.className).toContain('text-on-accent');
    expect(button.className).toContain('h-11');
  });

  it('variant에 따라 모양이 바뀐다', () => {
    render(
      <>
        <Button variant="secondary">보조</Button>
        <Button variant="destructive">삭제</Button>
        <Button variant="plain">글자만</Button>
      </>
    );

    expect(screen.getByRole('button', { name: '보조' }).className).toContain(
      'bg-fill'
    );
    expect(screen.getByRole('button', { name: '삭제' }).className).toContain(
      'text-negative'
    );
    expect(screen.getByRole('button', { name: '글자만' }).className).toContain(
      'bg-transparent'
    );
  });

  it('sm은 보이는 높이가 32지만 터치 영역을 넓히는 가상 요소가 붙는다', () => {
    render(<Button size="sm">작게</Button>);

    const button = screen.getByRole('button', { name: '작게' });
    expect(button.className).toContain('h-8');
    expect(button.className).toContain('after:-inset-y-1.5');
  });

  it('lg는 높이 48', () => {
    render(<Button size="lg">크게</Button>);

    expect(screen.getByRole('button', { name: '크게' }).className).toContain(
      'h-12'
    );
  });

  it('호출부의 className이 기본 클래스를 이긴다', () => {
    render(<Button className="h-9 bg-fill">덮어쓰기</Button>);

    const button = screen.getByRole('button', { name: '덮어쓰기' });
    expect(button.className).toContain('h-9');
    expect(button.className).not.toContain('h-11');
    expect(button.className).toContain('bg-fill');
    expect(button.className).not.toContain('bg-accent');
  });

  it('pending이면 눌리지 않고 로딩 표시가 나온다', () => {
    const onClick = jest.fn();
    render(
      <Button pending onClick={onClick}>
        저장
      </Button>
    );

    const button = screen.getByRole('button');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status')).toBeTruthy();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('pendingText가 있으면 그 글자를 보여 준다', () => {
    render(
      <Button pending pendingText="저장 중" pendingPosition="left">
        저장
      </Button>
    );

    expect(screen.getByText('저장 중')).toBeTruthy();
    expect(screen.queryByText('저장')).toBeNull();
  });

  it('disabled면 눌리지 않는다', () => {
    const onClick = jest.fn();
    render(
      <Button disabled onClick={onClick}>
        비활성
      </Button>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('type 같은 기본 속성을 그대로 넘긴다', () => {
    render(<Button type="submit">제출</Button>);

    expect(screen.getByRole('button').getAttribute('type')).toBe('submit');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/Button.dom.test.tsx`
Expected: FAIL — `bg-accent`가 없다(지금은 `bg-gray-800`).

- [ ] **Step 3: `Button.tsx` 전체 교체**

```tsx
import React, { ButtonHTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { Spinner } from '@/components/atoms/Spinner';

import { cn } from '@/lib/utils';

/**
 * 버튼. 같은 모양을 <Link>에 입힐 때는 buttonVariants()를 className에 쓴다.
 * sm은 보이는 높이가 32지만 after 가상 요소로 터치 영역을 44까지 넓힌다.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center whitespace-nowrap',
    'font-semibold transition-opacity duration-150 active:opacity-70',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:cursor-not-allowed disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent',
        secondary: 'bg-fill text-primary',
        destructive: 'bg-fill text-negative',
        plain: 'bg-transparent text-primary',
      },
      size: {
        lg: 'h-12 rounded-md px-5 text-body',
        md: 'h-11 rounded-md px-4 text-body',
        sm: "h-8 rounded-sm px-3 text-footnote after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NonNullable<ButtonVariantProps['variant']>;
  size?: NonNullable<ButtonVariantProps['size']>;
  pending?: boolean;
  pendingText?: string;
  pendingPosition?: 'left' | 'right' | 'center';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  pending = false,
  pendingText,
  pendingPosition = 'center',
  ...props
}: ButtonProps) {
  // 버튼이 pending 중이면 disabled 속성을 true로 설정
  const isDisabled = pending || disabled;

  // pending 중일 때 표시할 콘텐츠
  const renderContent = () => {
    if (!pending) return children;

    if (pendingPosition === 'center') {
      return (
        <>
          <Spinner className="mx-auto" />
          {pendingText && <span className="ml-2">{pendingText}</span>}
        </>
      );
    }

    if (pendingPosition === 'left') {
      return (
        <>
          <Spinner className="mr-2" />
          {pendingText || children}
        </>
      );
    }

    return (
      <>
        {pendingText || children}
        <Spinner className="ml-2" />
      </>
    );
  };

  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isDisabled}
      {...props}
    >
      {renderContent()}
    </button>
  );
}

export default Button;
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/Button.dom.test.tsx`
Expected: PASS (9개)

- [ ] **Step 5: 호출부의 예전 변형 이름 바꾸기**

먼저 바뀔 곳을 본다.

```bash
grep -rnE 'variant="(ghost|outline|default)"' src --include='*.tsx'
```

Expected: 25줄 안팎. 모두 `<Button …>`의 속성이다.

바꾼다.

```bash
grep -rlE 'variant="(ghost|outline|default)"' src --include='*.tsx' | xargs sed -i '' \
  -e 's/variant="ghost"/variant="plain"/g' \
  -e 's/variant="outline"/variant="secondary"/g' \
  -e 's/variant="default"/variant="primary"/g'
```

- [ ] **Step 6: 타입 검사로 잘못 바뀐 곳 찾기**

Run: `npx tsc --noEmit`
Expected: 오류 없음.

오류가 나면 두 경우 중 하나다.
- `Type '"primary"' is not assignable to type '"default" | "title"'` → `Button`이 아닌 `Label`(`@/components/atoms/Label`)의 `variant="default"`가 바뀐 것이다. 그 줄만 `variant="default"`로 되돌린다.
- `Type '"ghost"' is not assignable …` → 여러 줄에 걸친 JSX라 sed가 놓친 곳이다. 위 표대로 손으로 바꾼다.

- [ ] **Step 7: 전체 테스트**

Run: `npx jest`
Expected: 전부 PASS. 기존 테스트가 버튼의 예전 클래스 이름(`bg-gray-800` 등)을 검사하다 실패하면, 그 검사를 새 토큰 클래스(`bg-accent` 등)로 고친다.

- [ ] **Step 8: 커밋**

```bash
git add -A src
git commit -m "feat(ui): Button을 토큰 기반으로 다시 만들고 변형 이름 정리"
```

---

### Task 5: IconButton

**Files:**
- Create: `src/components/atoms/buttons/IconButton.tsx`
- Test: `src/__tests__/components/ui/IconButton.dom.test.tsx`

**Interfaces:**
- Consumes: `cn`
- Produces: `IconButton` — props: `ButtonHTMLAttributes<HTMLButtonElement>`에서 `aria-label`을 **필수**로 바꾼 것 + `variant?: 'plain' | 'filled'`(기본 `plain`). 크기는 44 × 44 고정. `type`의 기본값은 `'button'`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/IconButton.dom.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { IconButton } from '@/components/atoms/buttons/IconButton';

describe('IconButton', () => {
  it('aria-label로 찾을 수 있고 크기는 44 × 44다', () => {
    render(
      <IconButton aria-label="닫기">
        <svg />
      </IconButton>
    );

    const button = screen.getByRole('button', { name: '닫기' });
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('w-11');
  });

  it('폼 안에서 실수로 제출되지 않도록 type의 기본값은 button이다', () => {
    render(
      <IconButton aria-label="닫기">
        <svg />
      </IconButton>
    );

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('filled는 연회색 바탕이 깔린다', () => {
    render(
      <IconButton aria-label="추가" variant="filled">
        <svg />
      </IconButton>
    );

    expect(screen.getByRole('button').className).toContain('bg-fill');
  });

  it('누르면 onClick이 불린다', () => {
    const onClick = jest.fn();
    render(
      <IconButton aria-label="닫기" onClick={onClick}>
        <svg />
      </IconButton>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/IconButton.dom.test.tsx`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: 구현**

`src/components/atoms/buttons/IconButton.tsx`:

```tsx
import { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** 아이콘만 있어 글자가 없으므로 화면 낭독기용 이름이 꼭 필요하다. */
  'aria-label': string;
  variant?: 'plain' | 'filled';
}

/** 아이콘만 있는 버튼. 터치 영역 44 × 44. children에 lucide 아이콘을 넣는다. */
export function IconButton({
  variant = 'plain',
  type = 'button',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary',
        'transition-opacity duration-150 active:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'filled' && 'bg-fill',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default IconButton;
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/IconButton.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (4개), 타입 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/components/atoms/buttons/IconButton.tsx src/__tests__/components/ui/IconButton.dom.test.tsx
git commit -m "feat(ui): IconButton 추가"
```

---

### Task 6: Input · Select · Textarea · Checkbox

**Files:**
- Modify: `src/components/atoms/inputs/Input.tsx` (전체 교체)
- Modify: `src/components/atoms/inputs/Select.tsx` (전체 교체)
- Modify: `src/components/atoms/Textarea.tsx` (전체 교체)
- Modify: `src/components/atoms/inputs/Checkbox.tsx` (전체 교체)
- Modify: `src/styles/globals.css` (`@layer base { … }` 블록 바로 뒤에 추가)
- Test: `src/__tests__/components/ui/inputs.dom.test.tsx`

**Interfaces:**
- Consumes: `cn`
- Produces: 네 부품 모두 props와 export 방식은 지금과 같다 (`Input`·`Select`는 `forwardRef` named export, `Textarea`는 named + default, `Checkbox`는 named). 새로 내보내는 것: `inputClassName: string` (`Input.tsx`) — 입력칸 공통 모양. `Select`·`Textarea`가 가져다 쓴다.

**지금의 문제:** `Input`·`Select`에 `border-gray-300`(색)만 있고 `border`(두께)와 좌우 안쪽 여백이 없어 테두리 없는 24px짜리 칸으로 그려진다. `@tailwindcss/forms`가 설치돼 있지 않아서다. 부품에 모양을 직접 준다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/inputs.dom.test.tsx`:

```tsx
import { createRef } from 'react';

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { Textarea } from '@/components/atoms/Textarea';

describe('Input', () => {
  it('높이 44, 본문 크기 글자, 테두리, 좌우 여백이 있다', () => {
    render(<Input placeholder="이름" />);

    const input = screen.getByPlaceholderText('이름');
    for (const cls of ['h-11', 'text-body', 'border', 'px-3', 'rounded-md']) {
      expect(input.className.split(' ')).toContain(cls);
    }
  });

  it('기본은 가로를 꽉 채우고 fullWidth=false면 채우지 않는다', () => {
    const { rerender } = render(<Input placeholder="a" />);
    expect(screen.getByPlaceholderText('a').className).toContain('w-full');

    rerender(<Input placeholder="a" fullWidth={false} />);
    expect(screen.getByPlaceholderText('a').className).not.toContain('w-full');
  });

  it('react-hook-form이 쓰는 ref를 입력 요소에 연결한다', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);

    expect(ref.current?.tagName).toBe('INPUT');
  });

  it('호출부의 className이 이긴다', () => {
    render(<Input placeholder="a" className="h-9" />);

    const classes = screen.getByPlaceholderText('a').className.split(' ');
    expect(classes).toContain('h-9');
    expect(classes).not.toContain('h-11');
  });

  it('호출부가 글자를 작게 줘도 16px 아래로 내려가지 않게 text-body가 남는다', () => {
    // 지금 호출부 31곳이 text-sm을 넘긴다. 아이폰 확대를 막으려면 무시해야 한다.
    render(<Input placeholder="a" className="text-sm" />);

    const classes = screen.getByPlaceholderText('a').className.split(' ');
    expect(classes).toContain('text-body');
    expect(classes).not.toContain('text-sm');
  });
});

describe('Select', () => {
  const options = [
    { value: 'A', label: 'A조' },
    { value: 'B', label: 'B조' },
  ];

  it('안내 항목과 넘겨받은 항목을 그린다', () => {
    render(<Select options={options} aria-label="조" />);

    const select = screen.getByRole('combobox', { name: '조' });
    expect(select.querySelectorAll('option')).toHaveLength(3);
    expect(select.querySelector('option')?.textContent).toBe('선택해주세요');
  });

  it('입력칸과 같은 높이·테두리에 화살표 자리가 있다', () => {
    render(<Select options={options} aria-label="조" />);

    const classes = screen.getByRole('combobox').className.split(' ');
    for (const cls of ['h-11', 'border', 'text-body', 'select-chevron']) {
      expect(classes).toContain(cls);
    }
  });

  it('항목이 없어도 안내 항목만으로 그려진다', () => {
    render(<Select options={[]} aria-label="조" />);

    expect(screen.getByRole('combobox').querySelectorAll('option')).toHaveLength(
      1
    );
  });
});

describe('Textarea', () => {
  it('최소 높이 44, 본문 크기 글자, 테두리가 있다', () => {
    render(<Textarea placeholder="내용" />);

    const classes = screen.getByPlaceholderText('내용').className.split(' ');
    for (const cls of ['min-h-11', 'text-body', 'border', 'px-3']) {
      expect(classes).toContain(cls);
    }
  });
});

describe('Checkbox', () => {
  it('20 × 20 체크박스를 강조색으로 그린다', () => {
    render(<Checkbox aria-label="동의" />);

    const box = screen.getByRole('checkbox', { name: '동의' });
    const classes = box.className.split(' ');
    for (const cls of ['h-5', 'w-5', 'accent-accent']) {
      expect(classes).toContain(cls);
    }
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/inputs.dom.test.tsx`
Expected: FAIL — `h-11`이 없다.

- [ ] **Step 3: `Input.tsx` 전체 교체**

```tsx
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

/** 입력칸 공통 모양. Select·Textarea도 이것을 쓴다. */
export const inputClassName = cn(
  'block h-11 rounded-md border border-border bg-surface px-3 text-primary',
  'placeholder:text-tertiary',
  'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
  'aria-[invalid=true]:border-negative',
  'disabled:cursor-not-allowed disabled:opacity-50'
);

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { fullWidth = true, className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      // text-body를 맨 뒤에 둔다. 16px보다 작으면 아이폰이 입력할 때
      // 화면을 확대하므로, 호출부가 준 글자 크기보다 이쪽이 이겨야 한다.
      className={cn(inputClassName, fullWidth && 'w-full', className, 'text-body')}
      {...props}
    />
  );
});
```

- [ ] **Step 4: `Select.tsx` 전체 교체**

```tsx
import { forwardRef } from 'react';

import { inputClassName } from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
}

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ options, fullWidth = true, className, ...props }, ref) {
    return (
      <select
        ref={ref}
        // select-chevron: 기본 화살표를 지우고 직접 그린다 (globals.css).
        className={cn(
          inputClassName,
          'select-chevron appearance-none pr-10',
          fullWidth && 'w-full',
          className,
          'text-body'
        )}
        {...props}
      >
        <option value="">선택해주세요</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);
```

- [ ] **Step 5: `globals.css`에 select 화살표 추가**

`src/styles/globals.css`에서 Task 1이 넣은 `@layer base { … }` 블록이 끝나는 `}` 바로 다음 줄에 넣는다.

```css
@layer components {
  /* Select의 화살표. data URI 안에서는 CSS 변수를 쓸 수 없어 색(#636366 =
     --color-text-secondary)을 직접 적었다. 다크모드를 넣을 때 함께 바꾼다. */
  .select-chevron {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23636366' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px 16px;
  }
}
```

- [ ] **Step 6: `Textarea.tsx` 전체 교체**

```tsx
import React from 'react';

import TextareaAutosize, {
  TextareaAutosizeProps,
} from 'react-textarea-autosize';

import { inputClassName } from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface TextareaProps extends Omit<TextareaAutosizeProps, 'style'> {
  className?: string;
}

export function Textarea({
  className,
  minRows = 1,
  maxRows = 10,
  ...props
}: TextareaProps) {
  return (
    <TextareaAutosize
      // 여러 줄이라 높이를 고정하지 않고 최소 높이만 준다.
      className={cn(
        inputClassName,
        'h-auto min-h-11 w-full resize-none py-2.5',
        className,
        'text-body'
      )}
      minRows={minRows}
      maxRows={maxRows}
      {...props}
    />
  );
}

export default Textarea;
```

- [ ] **Step 7: `Checkbox.tsx` 전체 교체**

```tsx
import { cn } from '@/lib/utils';

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      // accent-accent: 브라우저 기본 체크박스를 강조색으로 칠한다.
      className={cn('mr-2 h-5 w-5 shrink-0 accent-accent', className)}
      {...props}
    />
  );
}
```

- [ ] **Step 8: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/inputs.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (10개), 타입 오류 없음.

- [ ] **Step 9: 눈으로 확인**

Run: `npm run dev` 후 게스트 신청 폼(`/clubs/1/guest` → 신청 버튼)을 연다.
확인: 입력칸에 테두리가 보이고 높이가 넉넉하다. 선택칸 오른쪽에 화살표가 하나만 보인다.

- [ ] **Step 10: 커밋**

```bash
git add src/components/atoms/inputs src/components/atoms/Textarea.tsx src/styles/globals.css src/__tests__/components/ui/inputs.dom.test.tsx
git commit -m "fix(ui): 입력 부품에 테두리·높이·글자 크기를 직접 지정"
```

---

### Task 7: Label · FormField

**Files:**
- Modify: `src/components/atoms/labels/Label.tsx` (전체 교체)
- Modify: `src/components/molecules/form/FormField.tsx` (전체 교체)
- Test: `src/__tests__/components/ui/FormField.dom.test.tsx`

**Interfaces:**
- Consumes: `cn`
- Produces: `Label`과 `FormField` 모두 props는 지금과 같다. 달라지는 동작: `FormField`가 자식 요소 **하나**에 `id`를 넣고 라벨의 `htmlFor`와 잇는다. 오류가 있으면 자식에 `aria-invalid`·`aria-describedby`를 넣는다.

`src/components/atoms/Label.tsx`(제목용 `<p>`, 다른 파일)는 이 과제에서 건드리지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/FormField.dom.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

describe('FormField', () => {
  it('라벨과 입력을 이어서, 라벨 글자로 입력을 찾을 수 있다', () => {
    render(
      <FormField label="이름">
        <Input />
      </FormField>
    );

    expect(screen.getByLabelText(/이름/).tagName).toBe('INPUT');
  });

  it('자식이 이미 id를 가졌으면 그 id를 쓴다', () => {
    render(
      <FormField label="이름">
        <Input id="my-name" />
      </FormField>
    );

    expect(screen.getByLabelText(/이름/).getAttribute('id')).toBe('my-name');
  });

  it('한 화면에 여러 개 있어도 id가 겹치지 않는다', () => {
    render(
      <>
        <FormField label="이름">
          <Input />
        </FormField>
        <FormField label="전화번호">
          <Input />
        </FormField>
      </>
    );

    const nameId = screen.getByLabelText(/이름/).getAttribute('id');
    const phoneId = screen.getByLabelText(/전화번호/).getAttribute('id');
    expect(nameId).toBeTruthy();
    expect(nameId).not.toBe(phoneId);
  });

  it('필수면 별표를 붙인다', () => {
    render(
      <FormField label="이름" required>
        <Input />
      </FormField>
    );

    expect(screen.getByText('*')).toBeTruthy();
  });

  it('오류가 있으면 문구를 보여 주고 입력에 알린다', () => {
    render(
      <FormField label="이름" error="이름을 입력해주세요">
        <Input />
      </FormField>
    );

    const alert = screen.getByRole('alert');
    const input = screen.getByLabelText(/이름/);
    expect(alert.textContent).toBe('이름을 입력해주세요');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(
      alert.getAttribute('id')
    );
  });

  it('오류가 없으면 aria-invalid를 붙이지 않는다', () => {
    render(
      <FormField label="이름">
        <Input />
      </FormField>
    );

    expect(screen.getByLabelText(/이름/).hasAttribute('aria-invalid')).toBe(
      false
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('자식이 Fragment·문자열·여러 개여도 경고 없이 그린다', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <>
        <FormField label="조각">
          <>
            <Input placeholder="앞" />
            <Input placeholder="뒤" />
          </>
        </FormField>
        <FormField label="글자">그냥 글자</FormField>
        <FormField label="여러 개">
          <Input placeholder="하나" />
          <Input placeholder="둘" />
        </FormField>
      </>
    );

    expect(screen.getByPlaceholderText('앞')).toBeTruthy();
    expect(screen.getByText('그냥 글자')).toBeTruthy();
    expect(screen.getByPlaceholderText('둘')).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('전화번호 3칸처럼 div로 감싼 자식이면 그 div에 id가 붙고 오류 없이 그려진다', () => {
    render(
      <FormField label="전화번호">
        <div data-testid="group">
          <Input placeholder="010" />
          <Input placeholder="1234" />
        </div>
      </FormField>
    );

    expect(screen.getByTestId('group').getAttribute('id')).toBeTruthy();
    expect(screen.getByPlaceholderText('1234')).toBeTruthy();
  });
});
```

`FormField`의 `children` 타입이 `ReactNode`라 자식 여러 개도 타입 오류 없이 넘길 수 있다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/FormField.dom.test.tsx`
Expected: FAIL — 첫 테스트에서 `Unable to find a label with the text of: /이름/` (라벨과 입력이 이어져 있지 않다).

- [ ] **Step 3: `Label.tsx` 전체 교체**

```tsx
import { cn } from '@/lib/utils';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({
  children,
  required = false,
  className,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn('block text-footnote font-medium text-secondary', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-negative">*</span>}
    </label>
  );
}
```

- [ ] **Step 4: `FormField.tsx` 전체 교체**

```tsx
import {
  cloneElement,
  Fragment,
  isValidElement,
  ReactElement,
  ReactNode,
  useId,
} from 'react';

import { Label } from '@/components/atoms/labels/Label';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  /** 검증 실패 메시지. 없으면 아무것도 렌더링하지 않는다. */
  error?: string;
}

interface ControlProps {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/** id를 넣어 줄 수 있는 자식인가: 요소 하나이고 Fragment가 아닐 때만. */
function isSingleControl(node: ReactNode): node is ReactElement<ControlProps> {
  return isValidElement(node) && node.type !== Fragment;
}

/**
 * 라벨 + 입력 + 오류 문구. 자식이 요소 하나면 id를 넣어 라벨과 잇는다.
 * 자식이 여러 개거나 Fragment·문자열이면 잇지 않고 그대로 그린다.
 */
export function FormField({
  label,
  children,
  required = false,
  error,
}: FormFieldProps) {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;

  let controlId: string | undefined;
  let control = children;

  if (isSingleControl(children)) {
    controlId = children.props.id ?? generatedId;
    control = cloneElement(children, {
      id: controlId,
      ...(error
        ? { 'aria-invalid': true, 'aria-describedby': errorId }
        : undefined),
    });
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={controlId} required={required}>
        {label}
      </Label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-footnote text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/FormField.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (8개), 타입 오류 없음.

- [ ] **Step 6: 기존 테스트가 깨지지 않았는지 확인**

Run: `npx jest`
Expected: 전부 PASS. `FormField`를 쓰는 대회 신청 폼 테스트(`PlayerListField`, `EventListField`, `TagListField`)가 포함된다.

- [ ] **Step 7: 커밋**

```bash
git add src/components/atoms/labels/Label.tsx src/components/molecules/form/FormField.tsx src/__tests__/components/ui/FormField.dom.test.tsx
git commit -m "fix(ui): FormField가 라벨과 입력을 연결하고 오류를 입력에 알림"
```

---

### Task 8: StatusChip

**Files:**
- Create: `src/components/atoms/StatusChip.tsx`
- Test: `src/__tests__/components/ui/StatusChip.dom.test.tsx`

**Interfaces:**
- Consumes: `statusTone`, `Tone`, `StatusDomain` (Task 3), `cn`
- Produces: `StatusChip` — props는 둘 중 하나의 꼴이다.
  - `{ tone: Tone; children: ReactNode; className?: string }`
  - `{ domain: StatusDomain; status: string | null | undefined; children: ReactNode; className?: string }`

  칩에 보일 글자(`children`)는 호출부가 정한다. 이 부품은 색만 정한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/StatusChip.dom.test.tsx`:

```tsx
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { StatusChip } from '@/components/atoms/StatusChip';

describe('StatusChip', () => {
  it('tone을 직접 주면 그 색으로 그린다', () => {
    render(<StatusChip tone="positive">참석</StatusChip>);

    const chip = screen.getByText('참석');
    expect(chip.className).toContain('bg-positive-soft');
    expect(chip.className).toContain('text-positive');
  });

  it('네 가지 톤을 모두 그린다', () => {
    render(
      <>
        <StatusChip tone="warning">대기</StatusChip>
        <StatusChip tone="negative">불참</StatusChip>
        <StatusChip tone="neutral">미응답</StatusChip>
      </>
    );

    expect(screen.getByText('대기').className).toContain('bg-warning-soft');
    expect(screen.getByText('불참').className).toContain('bg-negative-soft');
    expect(screen.getByText('미응답').className).toContain('bg-neutral-soft');
  });

  it('domain과 status를 주면 대응표에서 색을 찾는다', () => {
    render(
      <StatusChip domain="guest" status="REJECTED">
        거절
      </StatusChip>
    );

    expect(screen.getByText('거절').className).toContain('bg-negative-soft');
  });

  it('모르는 상태값이면 회색으로 그린다', () => {
    render(
      <StatusChip domain="guest" status="SOMETHING_NEW">
        새 상태
      </StatusChip>
    );

    expect(screen.getByText('새 상태').className).toContain('bg-neutral-soft');
  });

  it('상태가 없어도 회색으로 그리고 오류가 나지 않는다', () => {
    render(
      <StatusChip domain="member" status={undefined}>
        알 수 없음
      </StatusChip>
    );

    expect(screen.getByText('알 수 없음').className).toContain(
      'bg-neutral-soft'
    );
  });

  it('가장 작은 글자 크기와 알약 모양이다', () => {
    render(<StatusChip tone="positive">참석</StatusChip>);

    const classes = screen.getByText('참석').className.split(' ');
    expect(classes).toContain('text-caption');
    expect(classes).toContain('rounded-full');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/StatusChip.dom.test.tsx`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: 구현**

`src/components/atoms/StatusChip.tsx`:

```tsx
import { ReactNode } from 'react';

import { StatusDomain, statusTone, Tone } from '@/constants/statusTone';
import { cn } from '@/lib/utils';

interface BaseProps {
  children: ReactNode;
  className?: string;
}

type StatusChipProps = BaseProps &
  (
    | { tone: Tone; domain?: never; status?: never }
    | { tone?: never; domain: StatusDomain; status: string | null | undefined }
  );

// Tailwind가 클래스를 찾을 수 있게 완성된 문자열로 적는다.
const TONE_CLASS: Record<Tone, string> = {
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  negative: 'bg-negative-soft text-negative',
  neutral: 'bg-neutral-soft text-neutral',
};

/**
 * 상태 칩. 색만 정하고 글자는 호출부가 넣는다.
 * <StatusChip tone="positive">참석</StatusChip>
 * <StatusChip domain="guest" status={guest.status}>승인</StatusChip>
 */
export function StatusChip(props: StatusChipProps) {
  // tone을 직접 받은 꼴과 domain·status를 받은 꼴을 가른다.
  const tone =
    props.tone !== undefined
      ? props.tone
      : statusTone(props.domain, props.status);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold',
        TONE_CLASS[tone],
        props.className
      )}
    >
      {props.children}
    </span>
  );
}

export default StatusChip;
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/StatusChip.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (6개), 타입 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/components/atoms/StatusChip.tsx src/__tests__/components/ui/StatusChip.dom.test.tsx
git commit -m "feat(ui): StatusChip 추가"
```

---

### Task 9: Avatar

**Files:**
- Create: `src/components/atoms/Avatar.tsx`
- Test: `src/__tests__/components/ui/Avatar.dom.test.tsx`

**Interfaces:**
- Consumes: `cn`
- Produces:
  - `Avatar` — props: `name: string`, `src?: string | null`, `seed?: string`(바탕색을 고르는 기준. 없으면 `name`), `size?: 28 | 36 | 56`(기본 36), `className?: string`
  - `avatarColorClass(seed: string): string` — `'bg-avatar-1'` … `'bg-avatar-6'` 중 하나

기존 `GuestAvatar`는 이 과제에서 지우지 않는다(다음 계획에서 교체).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/Avatar.dom.test.tsx`:

```tsx
import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { Avatar, avatarColorClass } from '@/components/atoms/Avatar';

describe('Avatar', () => {
  it('사진이 없으면 이름 첫 글자를 보여 준다', () => {
    render(<Avatar name="김민수" />);

    const avatar = screen.getByRole('img', { name: '김민수' });
    expect(avatar.textContent).toBe('김');
    expect(avatar.className).toMatch(/bg-avatar-[1-6]/);
  });

  it('사진이 있으면 사진을 보여 준다', () => {
    render(<Avatar name="김민수" src="https://example.com/a.jpg" />);

    const img = screen.getByRole('img', { name: '김민수' });
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('https://example.com/a.jpg');
  });

  it('사진을 못 불러오면 첫 글자로 바꾼다', () => {
    render(<Avatar name="김민수" src="https://example.com/expired.jpg" />);

    fireEvent.error(screen.getByRole('img'));

    const avatar = screen.getByRole('img', { name: '김민수' });
    expect(avatar.tagName).toBe('SPAN');
    expect(avatar.textContent).toBe('김');
  });

  it('사진 주소가 바뀌면 다시 사진을 시도한다', () => {
    const { rerender } = render(
      <Avatar name="김민수" src="https://example.com/expired.jpg" />
    );
    fireEvent.error(screen.getByRole('img'));

    rerender(<Avatar name="김민수" src="https://example.com/new.jpg" />);

    expect(screen.getByRole('img').getAttribute('src')).toBe(
      'https://example.com/new.jpg'
    );
  });

  it('이름이 비었거나 공백뿐이면 물음표를 보여 준다', () => {
    const { rerender } = render(<Avatar name="" />);
    expect(screen.getByRole('img').textContent).toBe('?');

    rerender(<Avatar name="   " />);
    expect(screen.getByRole('img').textContent).toBe('?');
  });

  it('영문 이름은 대문자 첫 글자, 이모지로 시작해도 글자가 깨지지 않는다', () => {
    const { rerender } = render(<Avatar name="alex" />);
    expect(screen.getByRole('img').textContent).toBe('A');

    rerender(<Avatar name="🏸민수" />);
    expect(screen.getByRole('img').textContent).toBe('🏸');
  });

  it('src가 null이어도 첫 글자를 보여 준다', () => {
    render(<Avatar name="이지은" src={null} />);

    expect(screen.getByRole('img').textContent).toBe('이');
  });

  it('크기에 따라 클래스가 바뀐다', () => {
    const { rerender } = render(<Avatar name="김" size={28} />);
    expect(screen.getByRole('img').className).toContain('h-7');

    rerender(<Avatar name="김" />);
    expect(screen.getByRole('img').className).toContain('h-9');

    rerender(<Avatar name="김" size={56} />);
    expect(screen.getByRole('img').className).toContain('h-14');
  });
});

describe('avatarColorClass', () => {
  it('같은 기준이면 언제나 같은 색이다', () => {
    expect(avatarColorClass('guest-123')).toBe(avatarColorClass('guest-123'));
  });

  it('빈 기준이어도 색을 돌려준다', () => {
    expect(avatarColorClass('')).toMatch(/^bg-avatar-[1-6]$/);
  });

  it('여섯 색을 고루 쓴다', () => {
    const seen = new Set(
      Array.from({ length: 60 }, (_, i) => avatarColorClass(`member-${i}`))
    );
    expect(seen.size).toBe(6);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/Avatar.dom.test.tsx`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: 구현**

`src/components/atoms/Avatar.tsx`:

```tsx
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string | null;
  /** 바탕색을 고르는 기준. 이름이 같아도 색이 달라야 하면 id를 넘긴다. */
  seed?: string;
  size?: 28 | 36 | 56;
  className?: string;
}

const SIZE_CLASS = {
  28: 'h-7 w-7 text-caption',
  36: 'h-9 w-9 text-footnote',
  56: 'h-14 w-14 text-title',
} as const;

// Tailwind가 클래스를 찾을 수 있게 완성된 문자열로 적는다.
const PALETTE = [
  'bg-avatar-1',
  'bg-avatar-2',
  'bg-avatar-3',
  'bg-avatar-4',
  'bg-avatar-5',
  'bg-avatar-6',
] as const;

/** 같은 seed면 언제나 같은 바탕색. */
export function avatarColorClass(seed: string): string {
  let sum = 0;
  for (const char of seed) {
    sum += char.codePointAt(0) ?? 0;
  }
  return PALETTE[sum % PALETTE.length];
}

/** 프로필 사진. 사진이 없거나 못 불러오면 이름 첫 글자를 보여 준다. */
export function Avatar({ name, src, seed, size = 36, className }: AvatarProps) {
  // 실패한 주소를 기억해 둔다. 주소가 바뀌면 다시 시도하게 된다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const base = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-on-accent',
    SIZE_CLASS[size],
    className
  );

  if (src && failedSrc !== src) {
    return (
      // 카카오 프로필 등 외부 주소가 섞여 next/image의 허용 도메인으로
      // 관리하기 어렵고, 크기가 작아 최적화 이득도 없다.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        onError={() => setFailedSrc(src)}
        className={cn(base, 'object-cover')}
      />
    );
  }

  // Array.from으로 잘라야 이모지 같은 글자가 반으로 쪼개지지 않는다.
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';

  return (
    <span
      role="img"
      aria-label={name.trim() || '이름 없음'}
      className={cn(base, avatarColorClass(seed ?? name))}
    >
      {initial}
    </span>
  );
}

export default Avatar;
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/Avatar.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (11개), 타입 오류 없음.

`이름이 비었을 때` 테스트는 `getByRole('img')`를 이름 없이 찾으므로 `aria-label="이름 없음"`이어도 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add src/components/atoms/Avatar.tsx src/__tests__/components/ui/Avatar.dom.test.tsx
git commit -m "feat(ui): Avatar 추가"
```

---

### Task 10: ListGroup · ListRow

**Files:**
- Create: `src/components/molecules/list/ListGroup.tsx`
- Create: `src/components/molecules/list/ListRow.tsx`
- Test: `src/__tests__/components/ui/List.dom.test.tsx`

**Interfaces:**
- Consumes: `cn`, `next/link`, `lucide-react`의 `ChevronRight`
- Produces:
  - `ListGroup` — props: `label?: string`, `footer?: ReactNode`, `children: ReactNode`, `className?: string`
  - `ListRow` — props: `title: ReactNode`, `subtitle?: ReactNode`, `leading?: ReactNode`, `trailing?: ReactNode`, `href?: string`, `onClick?: () => void`, `className?: string`. `href`가 있으면 링크, `onClick`만 있으면 버튼, 둘 다 없으면 그냥 행. 누를 수 있는 행에는 오른쪽에 `›`가 붙는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/List.dom.test.tsx`:

```tsx
import { ReactNode } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';

// next/link는 라우터 없이 렌더링하면 환경에 따라 달라지므로 <a>로 바꿔 둔다.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('ListGroup', () => {
  it('머리글, 행, 바닥글을 그린다', () => {
    render(
      <ListGroup label="이번 주 운동" footer="참석은 전날까지 바꿀 수 있어요">
        <ListRow title="10월 4일 토요일" />
      </ListGroup>
    );

    expect(screen.getByText('이번 주 운동')).toBeTruthy();
    expect(screen.getByText('10월 4일 토요일')).toBeTruthy();
    expect(screen.getByText('참석은 전날까지 바꿀 수 있어요')).toBeTruthy();
  });

  it('머리글과 바닥글이 없으면 그 자리를 만들지 않는다', () => {
    const { container } = render(
      <ListGroup>
        <ListRow title="행" />
      </ListGroup>
    );

    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });

  it('행이 하나도 없어도 오류 없이 그린다', () => {
    const { container } = render(<ListGroup label="비어 있음">{null}</ListGroup>);

    expect(container.textContent).toBe('비어 있음');
  });
});

describe('ListRow', () => {
  it('제목, 부제, 앞·뒤 요소를 그린다', () => {
    render(
      <ListRow
        title="김민수"
        subtitle="A조 · 남자"
        leading={<span>앞</span>}
        trailing={<span>뒤</span>}
      />
    );

    expect(screen.getByText('김민수')).toBeTruthy();
    expect(screen.getByText('A조 · 남자')).toBeTruthy();
    expect(screen.getByText('앞')).toBeTruthy();
    expect(screen.getByText('뒤')).toBeTruthy();
  });

  it('href가 있으면 링크이고 화살표가 붙는다', () => {
    const { container } = render(
      <ListRow title="운동 상세" href="/clubs/1/workouts/3" />
    );

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/clubs/1/workouts/3');
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('onClick만 있으면 버튼이고 누르면 불린다', () => {
    const onClick = jest.fn();
    render(<ListRow title="상태 변경" onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('type')).toBe('button');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('href도 onClick도 없으면 누를 수 없는 행이고 화살표가 없다', () => {
    const { container } = render(<ListRow title="이번 달 합계" />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('최소 높이 44를 지킨다', () => {
    const { container } = render(<ListRow title="행" />);

    expect((container.firstChild as HTMLElement).className).toContain(
      'min-h-11'
    );
  });

  it('긴 제목은 한 줄로 자르되 전체 글자는 남아 있다', () => {
    const long = '아주 긴 대회 이름 '.repeat(10).trim();
    render(<ListRow title={long} />);

    const title = screen.getByText(long);
    expect(title.className).toContain('truncate');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/List.dom.test.tsx`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: `ListGroup.tsx` 구현**

```tsx
import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ListGroupProps {
  /** 묶음 위의 작은 머리글 */
  label?: string;
  /** 묶음 아래의 안내 문구 */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * iOS 설정 앱 방식의 묶음 리스트. 연회색 바탕 위의 흰 묶음이고
 * 행 사이는 얇은 선으로 나눈다. 자식으로 ListRow를 넣는다.
 */
export function ListGroup({
  label,
  footer,
  children,
  className,
}: ListGroupProps) {
  return (
    <section className={className}>
      {label && (
        <h3 className="px-4 pb-2 text-footnote text-secondary">{label}</h3>
      )}
      <div
        className={cn(
          'overflow-hidden rounded-md bg-surface',
          'divide-y-[0.5px] divide-separator'
        )}
      >
        {children}
      </div>
      {footer && (
        <p className="px-4 pt-2 text-footnote text-secondary">{footer}</p>
      )}
    </section>
  );
}

export default ListGroup;
```

- [ ] **Step 4: `ListRow.tsx` 구현**

```tsx
import { ReactNode } from 'react';

import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** 왼쪽: 아바타, 아이콘 */
  leading?: ReactNode;
  /** 오른쪽: 상태 칩, 값 */
  trailing?: ReactNode;
  /** 있으면 링크가 된다 */
  href?: string;
  /** href 없이 이것만 있으면 버튼이 된다 */
  onClick?: () => void;
  className?: string;
}

/** ListGroup 안의 한 줄. 누를 수 있는 행에는 오른쪽에 화살표가 붙는다. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  href,
  onClick,
  className,
}: ListRowProps) {
  const interactive = Boolean(href || onClick);

  const rowClass = cn(
    'flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left',
    interactive && 'transition-colors duration-150 active:bg-fill',
    className
  );

  const content = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-headline text-primary">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-footnote text-secondary">
            {subtitle}
          </span>
        )}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
      {interactive && (
        <ChevronRight
          aria-hidden
          className="h-5 w-5 shrink-0 text-tertiary"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={rowClass}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {content}
      </button>
    );
  }

  return <div className={rowClass}>{content}</div>;
}

export default ListRow;
```

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/List.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (10개), 타입 오류 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/components/molecules/list src/__tests__/components/ui/List.dom.test.tsx
git commit -m "feat(ui): 묶음 리스트(ListGroup, ListRow) 추가"
```

---

### Task 11: SegmentedControl

**Files:**
- Create: `src/components/molecules/SegmentedControl.tsx`
- Test: `src/__tests__/components/ui/SegmentedControl.dom.test.tsx`

**Interfaces:**
- Consumes: `cn`
- Produces: `SegmentedControl<T extends string>` — props: `options: Array<{ value: T; label: string }>`, `value: T`, `onChange: (value: T) => void`, `'aria-label': string`, `className?: string`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/SegmentedControl.dom.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { SegmentedControl } from '@/components/molecules/SegmentedControl';

const options = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활동' },
  { value: 'unpaid', label: '미납' },
];

describe('SegmentedControl', () => {
  it('항목을 모두 그리고 고른 것을 표시한다', () => {
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value="active"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('radiogroup', { name: '회원 필터' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(
      screen.getByRole('radio', { name: '활동' }).getAttribute('aria-checked')
    ).toBe('true');
    expect(
      screen.getByRole('radio', { name: '전체' }).getAttribute('aria-checked')
    ).toBe('false');
  });

  it('다른 항목을 누르면 그 값으로 onChange가 불린다', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value="all"
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: '미납' }));
    expect(onChange).toHaveBeenCalledWith('unpaid');
  });

  it('이미 고른 항목을 다시 눌러도 onChange를 부르지 않는다', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value="all"
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: '전체' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('value가 어느 항목과도 맞지 않으면 아무것도 고르지 않은 채로 그린다', () => {
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value={'gone' as 'all'}
        onChange={() => {}}
      />
    );

    const checked = screen
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(0);
  });

  it('고른 항목만 흰 바탕이다', () => {
    render(
      <SegmentedControl
        aria-label="회원 필터"
        options={options}
        value="all"
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('radio', { name: '전체' }).className).toContain(
      'bg-surface'
    );
    expect(screen.getByRole('radio', { name: '활동' }).className).not.toContain(
      'bg-surface'
    );
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/SegmentedControl.dom.test.tsx`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: 구현**

`src/components/molecules/SegmentedControl.tsx`:

```tsx
import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  /** 무엇을 고르는지. 화면 낭독기가 읽는다. */
  'aria-label': string;
  className?: string;
}

/** 2–4개 중 하나를 고르는 이어 붙인 버튼. 항목이 더 많으면 Select를 쓴다. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex h-9 rounded-sm bg-fill p-0.5', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
            className={cn(
              // after: 보이는 높이는 32지만 터치 영역을 44까지 넓힌다.
              "relative flex-1 whitespace-nowrap rounded-[6px] px-3 text-footnote after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
              'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              selected
                ? 'bg-surface font-semibold text-primary'
                : 'font-medium text-secondary'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
```

`rounded-[6px]`는 바깥 둥글기(8)에서 안쪽 여백(2)을 뺀 값이다. 안쪽 모서리가 바깥과 나란해 보이게 하려는 것으로, 토큰에 없는 유일한 둥글기다.

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/SegmentedControl.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (5개), 타입 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/components/molecules/SegmentedControl.tsx src/__tests__/components/ui/SegmentedControl.dom.test.tsx
git commit -m "feat(ui): SegmentedControl 추가"
```

---

### Task 12: Sheet

**Files:**
- Create: `src/components/organisms/sheet/Sheet.tsx`
- Modify: `jest.setup.dom.js` (끝에 추가)
- Test: `src/__tests__/components/ui/Sheet.dom.test.tsx`

**Interfaces:**
- Consumes: `IconButton` (Task 5), `cn`, `@headlessui/react`의 `Dialog` · `DialogBackdrop` · `DialogPanel` · `DialogTitle`, `lucide-react`의 `X`
- Produces: `Sheet` — props: `open: boolean`, `onClose: () => void`, `title: string`, `children: ReactNode`, `footer?: ReactNode`(아래에 고정되는 버튼 영역), `hideCloseButton?: boolean`, `className?: string`(패널에 붙는다)

**동작:** 휴대폰에서는 아래에서 올라오는 시트, `md`(768px) 이상에서는 가운데 모달. ESC·바깥 누르기·✕로 닫히고 모두 `onClose`를 부른다. 열려 있는 동안 뒤 화면은 스크롤되지 않고 포커스가 안에 갇힌다(headlessui가 처리).

> 바깥 누르기는 headlessui가 실제 포인터 이벤트 순서로 판정하므로 jsdom 테스트로 믿을 만하게 재현되지 않는다. 자동 테스트는 ESC와 ✕만 다루고, 바깥 누르기는 Task 15의 미리보기 화면에서 손으로 확인한다.

- [ ] **Step 1: jsdom에 없는 브라우저 API 채우기**

headlessui 2.x는 `ResizeObserver`와 `Element.prototype.getAnimations`를 쓰는데 jsdom에는 없다. `jest.setup.dom.js` 맨 끝에 추가한다.

```js

// @headlessui/react가 쓰는 브라우저 API 중 jsdom에 없는 것을 채운다.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (
  typeof Element !== 'undefined' &&
  typeof Element.prototype.getAnimations !== 'function'
) {
  // 진행 중인 애니메이션이 없다고 답하면 headlessui가 전환을 바로 끝낸다.
  Element.prototype.getAnimations = () => [];
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/__tests__/components/ui/Sheet.dom.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { Sheet } from '@/components/organisms/sheet/Sheet';

describe('Sheet', () => {
  it('열려 있으면 제목과 내용을 대화상자로 보여 준다', () => {
    render(
      <Sheet open onClose={() => {}} title="게스트 신청">
        <p>내용</p>
      </Sheet>
    );

    const dialog = screen.getByRole('dialog', { name: '게스트 신청' });
    expect(dialog).toBeTruthy();
    expect(screen.getByText('내용')).toBeTruthy();
  });

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(
      <Sheet open={false} onClose={() => {}} title="게스트 신청">
        <p>내용</p>
      </Sheet>
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('내용')).toBeNull();
  });

  it('닫기 버튼을 누르면 onClose가 불린다', () => {
    const onClose = jest.fn();
    render(
      <Sheet open onClose={onClose} title="게스트 신청">
        <p>내용</p>
      </Sheet>
    );

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC를 누르면 onClose가 불린다', () => {
    const onClose = jest.fn();
    render(
      <Sheet open onClose={onClose} title="게스트 신청">
        <p>내용</p>
      </Sheet>
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('hideCloseButton이면 닫기 버튼이 없다', () => {
    render(
      <Sheet open onClose={() => {}} title="확인" hideCloseButton>
        <p>내용</p>
      </Sheet>
    );

    expect(screen.queryByRole('button', { name: '닫기' })).toBeNull();
  });

  it('footer를 주면 아래 고정 영역에 그린다', () => {
    render(
      <Sheet
        open
        onClose={() => {}}
        title="게스트 신청"
        footer={<button type="button">신청하기</button>}
      >
        <p>내용</p>
      </Sheet>
    );

    const submit = screen.getByRole('button', { name: '신청하기' });
    expect(submit.closest('footer')).toBeTruthy();
  });

  it('내용이 길어도 화면을 넘지 않도록 최대 높이와 안쪽 스크롤이 있다', () => {
    render(
      <Sheet open onClose={() => {}} title="긴 폼">
        <p>내용</p>
      </Sheet>
    );

    const body = screen.getByText('내용').parentElement as HTMLElement;
    expect(body.className).toContain('overflow-y-auto');
    expect(body.parentElement?.className).toContain('max-h-[90dvh]');
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/Sheet.dom.test.tsx`
Expected: FAIL — `Cannot find module`

- [ ] **Step 4: 구현**

`src/components/organisms/sheet/Sheet.tsx`:

```tsx
import { ReactNode } from 'react';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { X } from 'lucide-react';

import { IconButton } from '@/components/atoms/buttons/IconButton';

import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  /** ESC, 바깥 누르기, 닫기 버튼에서 모두 불린다. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 아래에 고정되는 버튼 영역. 긴 폼의 제출 버튼을 여기에 둔다. */
  footer?: ReactNode;
  hideCloseButton?: boolean;
  /** 패널에 붙는다. 폭을 바꿀 때 쓴다 (예: md:max-w-lg). */
  className?: string;
}

/**
 * 떠 있는 창. 휴대폰에서는 아래에서 올라오는 시트, md 이상에서는 가운데 모달.
 * 포커스 가두기·ESC·스크롤 잠금·포털은 headlessui Dialog가 처리한다.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  hideCloseButton = false,
  className,
}: SheetProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-sheet">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-scrim transition-opacity duration-200 ease-out data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 flex items-end justify-center md:items-center md:p-4">
        <DialogPanel
          transition
          className={cn(
            'flex max-h-[90dvh] w-full flex-col rounded-t-lg bg-surface shadow-overlay',
            'md:max-w-md md:rounded-lg',
            'transition duration-200 ease-out',
            'data-[closed]:translate-y-full md:data-[closed]:translate-y-0 md:data-[closed]:opacity-0',
            className
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 pl-4 pr-1 pt-2">
            <DialogTitle className="text-title text-primary">
              {title}
            </DialogTitle>
            {hideCloseButton ? (
              // 닫기 버튼이 없어도 제목 줄의 높이가 같도록 자리를 남긴다.
              <span className="h-11" />
            ) : (
              <IconButton aria-label="닫기" onClick={onClose}>
                <X aria-hidden className="h-5 w-5" />
              </IconButton>
            )}
          </header>

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2',
              // footer가 없으면 본문이 홈 인디케이터 여백을 맡는다.
              footer ? 'pb-4' : 'pb-[calc(16px+env(safe-area-inset-bottom))]'
            )}
          >
            {children}
          </div>

          {footer && (
            <footer className="shrink-0 border-t border-border px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
              {footer}
            </footer>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default Sheet;
```

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/Sheet.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (7개), 타입 오류 없음.

실패할 때:
- `ReferenceError: ResizeObserver is not defined` 또는 `getAnimations is not a function` → Step 1의 코드가 `jest.setup.dom.js`에 들어갔는지 확인한다.
- `내용이 길어도…` 테스트에서 부모를 못 찾음 → 구현의 본문 `<div>`가 `DialogPanel`의 직계 자식인지 확인한다(사이에 다른 요소를 끼우지 않는다).

- [ ] **Step 6: 전체 테스트 (setup 파일을 바꿨으므로)**

Run: `npx jest`
Expected: 전부 PASS.

- [ ] **Step 7: 커밋**

```bash
git add src/components/organisms/sheet/Sheet.tsx src/__tests__/components/ui/Sheet.dom.test.tsx jest.setup.dom.js
git commit -m "feat(ui): Sheet(휴대폰 시트 / PC 모달) 추가"
```

---

### Task 13: ConfirmProvider · useConfirm

**Files:**
- Create: `src/components/organisms/sheet/ConfirmProvider.tsx`
- Modify: `src/pages/_app.tsx` (`<Layout>`을 `<ConfirmProvider>`로 감싼다)
- Test: `src/__tests__/components/ui/ConfirmProvider.dom.test.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 12), `Button` (Task 4)
- Produces:
  - `ConfirmProvider` — props: `children: ReactNode`
  - `useConfirm(): (options: ConfirmOptions) => Promise<boolean>` — Provider 밖에서 부르면 오류를 던진다
  - `interface ConfirmOptions { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; hideCancel?: boolean }`

**쓰는 법 (다음 계획에서 `confirm()`·`alert()`를 바꿀 때):**

```tsx
const confirm = useConfirm();

// confirm() 대신
if (await confirm({ title: '게시글을 삭제할까요?', destructive: true, confirmLabel: '삭제' })) { … }

// alert() 대신
await confirm({ title: '신청이 마감됐어요', hideCancel: true });
```

**끝나는 값:** 확인 버튼 → `true`. 취소 버튼·ESC·바깥 누르기 → `false`. 떠 있는 동안 `confirm()`이 또 불리면 먼저 것은 `false`로 끝나고 새 것으로 바뀐다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/ConfirmProvider.dom.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import {
  ConfirmOptions,
  ConfirmProvider,
  useConfirm,
} from '@/components/organisms/sheet/ConfirmProvider';

/** 버튼을 누르면 confirm을 띄우고 결과를 onResult로 알리는 시험용 화면. */
function Trigger({
  options,
  onResult,
  label = '열기',
}: {
  options: ConfirmOptions;
  onResult: (result: boolean) => void;
  label?: string;
}) {
  const confirm = useConfirm();
  return (
    <button type="button" onClick={() => confirm(options).then(onResult)}>
      {label}
    </button>
  );
}

async function open(label = '열기') {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
}

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

/** 닫히는 전환이 끝나 대화상자가 사라질 때까지 기다린다. */
async function waitUntilClosed() {
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

describe('useConfirm', () => {
  it('제목과 설명을 보여 준다', async () => {
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: '삭제할까요?', message: '되돌릴 수 없어요' }}
          onResult={() => {}}
        />
      </ConfirmProvider>
    );

    await open();

    expect(screen.getByRole('dialog', { name: '삭제할까요?' })).toBeTruthy();
    expect(screen.getByText('되돌릴 수 없어요')).toBeTruthy();
  });

  it('확인을 누르면 true로 끝나고 닫힌다', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await press('확인');

    expect(onResult).toHaveBeenCalledWith(true);
    await waitUntilClosed();
  });

  it('취소를 누르면 false로 끝난다', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await press('취소');

    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('ESC로 닫으면 false로 끝난다', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    });

    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('버튼 글자를 바꿀 수 있고 destructive면 확인 버튼이 빨강 글자다', async () => {
    render(
      <ConfirmProvider>
        <Trigger
          options={{
            title: '삭제할까요?',
            confirmLabel: '삭제',
            cancelLabel: '그만두기',
            destructive: true,
          }}
          onResult={() => {}}
        />
      </ConfirmProvider>
    );

    await open();

    expect(screen.getByRole('button', { name: '그만두기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '삭제' }).className).toContain(
      'text-negative'
    );
  });

  it('hideCancel이면 취소 버튼이 없다 (alert 대체)', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: '신청이 마감됐어요', hideCancel: true }}
          onResult={onResult}
        />
      </ConfirmProvider>
    );

    await open();

    expect(screen.queryByRole('button', { name: '취소' })).toBeNull();
    await press('확인');
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('떠 있는 동안 또 불리면 먼저 것은 false로 끝나고 새 것으로 바뀐다', async () => {
    const first = jest.fn();
    const second = jest.fn();

    function Double() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={() => {
            confirm({ title: '첫 번째' }).then(first);
            confirm({ title: '두 번째' }).then(second);
          }}
        >
          두 번 열기
        </button>
      );
    }

    render(
      <ConfirmProvider>
        <Double />
      </ConfirmProvider>
    );

    await open('두 번 열기');

    expect(first).toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog', { name: '두 번째' })).toBeTruthy();

    await press('확인');
    expect(second).toHaveBeenCalledWith(true);
  });

  it('닫은 뒤 다시 열 수 있다', async () => {
    const onResult = jest.fn();
    render(
      <ConfirmProvider>
        <Trigger options={{ title: '삭제할까요?' }} onResult={onResult} />
      </ConfirmProvider>
    );

    await open();
    await press('취소');
    await waitUntilClosed();
    await open();
    await press('확인');

    expect(onResult.mock.calls).toEqual([[false], [true]]);
  });

  it('Provider 밖에서 쓰면 무엇이 빠졌는지 알려 주는 오류를 던진다', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(<Trigger options={{ title: 'x' }} onResult={() => {}} />)
    ).toThrow('ConfirmProvider');

    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/ConfirmProvider.dom.test.tsx`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: 구현**

`src/components/organisms/sheet/ConfirmProvider.tsx`:

```tsx
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Sheet } from '@/components/organisms/sheet/Sheet';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** 기본 '확인' */
  confirmLabel?: string;
  /** 기본 '취소' */
  cancelLabel?: string;
  /** 삭제처럼 되돌릴 수 없는 동작이면 확인 버튼을 빨강 글자로 */
  destructive?: boolean;
  /** 취소 버튼을 숨긴다. alert() 대신 쓸 때 */
  hideCancel?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * window.confirm / alert를 대신하는 확인창을 앱 전체에 하나 둔다.
 * _app.tsx에서 한 번 감싸고, 화면에서는 useConfirm()으로 부른다.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // 닫히는 애니메이션 동안에도 글자가 남아 있도록 options는 따로 둔다.
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolveRef = useRef<((result: boolean) => void) | null>(null);

  const settle = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<Confirm>((next) => {
    // 이미 떠 있으면 먼저 것은 취소로 끝낸다. 끝나지 않는 Promise를 남기지 않는다.
    resolveRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(next);
      setOpen(true);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={open}
        onClose={() => settle(false)}
        title={options.title}
        hideCloseButton
        footer={
          <div className="flex gap-2">
            {!options.hideCancel && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => settle(false)}
              >
                {options.cancelLabel ?? '취소'}
              </Button>
            )}
            <Button
              type="button"
              variant={options.destructive ? 'destructive' : 'primary'}
              className="flex-1"
              onClick={() => settle(true)}
            >
              {options.confirmLabel ?? '확인'}
            </Button>
          </div>
        }
      >
        {options.message && (
          <p className="whitespace-pre-line text-body text-secondary">
            {options.message}
          </p>
        )}
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error(
      'useConfirm은 ConfirmProvider 안에서만 쓸 수 있습니다. _app.tsx를 확인하세요.'
    );
  }
  return confirm;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/ConfirmProvider.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (9개), 타입 오류 없음.

- [ ] **Step 5: `_app.tsx`에서 감싸기**

`src/pages/_app.tsx`의 import 묶음에서 `Layout` import 바로 위에 추가한다.

```ts
import { ConfirmProvider } from '@/components/organisms/sheet/ConfirmProvider';
```

그리고 아래 부분을

```tsx
        <Layout>
          <Component {...pageProps} />
        </Layout>
```

이렇게 바꾼다.

```tsx
        <ConfirmProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ConfirmProvider>
```

`{/* <LocatorProvider> */}` 주석 두 줄은 그대로 둔다.

- [ ] **Step 6: 타입 검사와 lint**

Run: `npx tsc --noEmit && npx next lint --file src/pages/_app.tsx`
Expected: 오류 없음. import 순서 경고가 나오면 `npx next lint --fix --file src/pages/_app.tsx`로 정렬한다.

- [ ] **Step 7: 커밋**

```bash
git add src/components/organisms/sheet/ConfirmProvider.tsx src/__tests__/components/ui/ConfirmProvider.dom.test.tsx src/pages/_app.tsx
git commit -m "feat(ui): confirm/alert를 대신할 useConfirm 추가"
```

---

### Task 14: EmptyState · Skeleton

**Files:**
- Create: `src/components/molecules/EmptyState.tsx`
- Create: `src/components/atoms/Skeleton.tsx`
- Test: `src/__tests__/components/ui/feedback.dom.test.tsx`

**Interfaces:**
- Consumes: `cn`, `lucide-react`의 `LucideIcon` 타입
- Produces:
  - `EmptyState` — props: `icon?: LucideIcon`, `title: string`, `description?: string`, `action?: ReactNode`, `className?: string`
  - `Skeleton` — props: `className?: string` (크기는 호출부가 `h-5 w-32`처럼 준다)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/ui/feedback.dom.test.tsx`:

```tsx
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { CalendarX } from 'lucide-react';

import { Skeleton } from '@/components/atoms/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState';

describe('EmptyState', () => {
  it('아이콘, 문구, 설명, 버튼을 그린다', () => {
    const { container } = render(
      <EmptyState
        icon={CalendarX}
        title="이번 주 운동이 아직 없어요"
        description="일정이 올라오면 여기에 보여요"
        action={<button type="button">일정 만들기</button>}
      />
    );

    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.getByText('이번 주 운동이 아직 없어요')).toBeTruthy();
    expect(screen.getByText('일정이 올라오면 여기에 보여요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '일정 만들기' })).toBeTruthy();
  });

  it('문구만 줘도 그려진다', () => {
    const { container } = render(<EmptyState title="게시글이 없어요" />);

    expect(screen.getByText('게시글이 없어요')).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });
});

describe('Skeleton', () => {
  it('깜빡이는 자리 표시이고 화면 낭독기에는 숨긴다', () => {
    const { container } = render(<Skeleton className="h-5 w-32" />);

    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-fill');
    expect(el.className).toContain('h-5');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest src/__tests__/components/ui/feedback.dom.test.tsx`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: `Skeleton.tsx` 구현**

```tsx
import { cn } from '@/lib/utils';

interface SkeletonProps {
  /** 크기를 준다. 예: "h-5 w-32" */
  className?: string;
}

/** 불러오는 동안 글자·사진 자리에 두는 깜빡이는 회색 막대. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-sm bg-fill', className)}
    />
  );
}

export default Skeleton;
```

- [ ] **Step 4: `EmptyState.tsx` 구현**

```tsx
import { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 다음에 할 수 있는 일. 보통 Button 하나 */
  action?: ReactNode;
  className?: string;
}

/** 목록이 비었을 때 보여 주는 안내. 말투는 부드럽게 쓴다 (설계 W3). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-4 py-12 text-center',
        className
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          strokeWidth={1.5}
          className="mb-3 h-10 w-10 text-tertiary"
        />
      )}
      <h3 className="text-headline text-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-callout text-secondary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
```

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npx jest src/__tests__/components/ui/feedback.dom.test.tsx && npx tsc --noEmit`
Expected: PASS (3개), 타입 오류 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/components/molecules/EmptyState.tsx src/components/atoms/Skeleton.tsx src/__tests__/components/ui/feedback.dom.test.tsx
git commit -m "feat(ui): EmptyState와 Skeleton 추가"
```

---

### Task 15: 부품 미리보기 화면과 마지막 검증

**Files:**
- Create: `src/pages/dev/ui-kit.tsx`
- Modify: `next-sitemap.config.js:7` (`exclude`에 `/dev/*` 추가)
- Modify: `next-sitemap.config.ts` (같은 `exclude`가 있으면 똑같이)

**Interfaces:**
- Consumes: 이 계획의 모든 부품
- Produces: 개발 서버에서만 열리는 `/dev/ui-kit`. 운영 빌드에서는 404.

**목적:** 디자이너가 아닌 사람도 한 화면에서 부품 전체를 보고 "이 느낌이 맞나"를 판단할 수 있게 한다. 실기기 확인(설계 9장)과 Sheet의 바깥 누르기 확인도 여기서 한다.

- [ ] **Step 1: 미리보기 화면 작성**

`src/pages/dev/ui-kit.tsx`:

```tsx
import { useState } from 'react';

import type { GetServerSideProps } from 'next';

import { CalendarX, Plus } from 'lucide-react';

import { Avatar } from '@/components/atoms/Avatar';
import { Button } from '@/components/atoms/buttons/Button';
import { IconButton } from '@/components/atoms/buttons/IconButton';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { Skeleton } from '@/components/atoms/Skeleton';
import { StatusChip } from '@/components/atoms/StatusChip';
import { Textarea } from '@/components/atoms/Textarea';
import { EmptyState } from '@/components/molecules/EmptyState';
import { FormField } from '@/components/molecules/form/FormField';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { cn } from '@/lib/utils';

// 개발 서버에서만 연다. 운영에서는 404.
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

type Filter = 'all' | 'active' | 'unpaid';

const TYPE_SCALE = [
  ['text-large-title', '출석체크'],
  ['text-title', '게스트 신청'],
  ['text-headline', '10월 4일 토요일'],
  ['text-body', '셔틀콕은 클럽에서 준비해요.'],
  ['text-callout', '참가자 24명'],
  ['text-footnote', '오후 7:00 · 당산초 체육관'],
  ['text-caption', '가장 작은 글자'],
] as const;

export default function UiKitPage() {
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [lastConfirm, setLastConfirm] = useState('아직 없음');

  return (
    <div
      data-density={compact ? 'compact' : undefined}
      className="mx-auto max-w-2xl space-y-6 py-6"
    >
      <header>
        <h1 className="text-large-title text-primary">부품 미리보기</h1>
        <p className="mt-1 text-footnote text-secondary">
          개발 서버에서만 보이는 화면입니다.
        </p>
        <label className="mt-3 flex items-center text-callout text-primary">
          <Checkbox
            checked={compact}
            onChange={(event) => setCompact(event.target.checked)}
          />
          PC 관리용 작은 글자 (창 폭 1024px 이상에서만 바뀜)
        </label>
      </header>

      <ListGroup label="글자 크기 7단계">
        {TYPE_SCALE.map(([cls, sample]) => (
          <div key={cls} className="flex items-baseline gap-3 px-4 py-3">
            <code className="w-36 shrink-0 text-caption text-secondary">
              {cls}
            </code>
            <span className={cn(cls, 'text-primary')}>{sample}</span>
          </div>
        ))}
      </ListGroup>

      <ListGroup label="버튼">
        <div className="space-y-3 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button>주 버튼</Button>
            <Button variant="secondary">보조</Button>
            <Button variant="destructive">삭제</Button>
            <Button variant="plain">글자만</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg">크게 48</Button>
            <Button size="md">보통 44</Button>
            <Button size="sm">작게 32</Button>
            <Button disabled>비활성</Button>
            <Button pending pendingText="저장 중" pendingPosition="left">
              저장
            </Button>
            <IconButton aria-label="추가">
              <Plus aria-hidden className="h-5 w-5" />
            </IconButton>
            <IconButton aria-label="추가" variant="filled">
              <Plus aria-hidden className="h-5 w-5" />
            </IconButton>
          </div>
          <Button size="lg" className="w-full">
            10월 9일 참석하기
          </Button>
        </div>
      </ListGroup>

      <ListGroup label="상태 칩">
        <div className="flex flex-wrap gap-2 px-4 py-4">
          <StatusChip tone="positive">참석</StatusChip>
          <StatusChip tone="warning">대기</StatusChip>
          <StatusChip tone="negative">불참</StatusChip>
          <StatusChip tone="neutral">미응답</StatusChip>
          <StatusChip domain="guest" status="APPROVED">
            게스트 승인
          </StatusChip>
          <StatusChip domain="feeRecord" status="ERROR">
            회비 오류
          </StatusChip>
        </div>
      </ListGroup>

      <ListGroup
        label="묶음 리스트"
        footer="누를 수 있는 행에는 오른쪽에 화살표가 붙어요."
      >
        <ListRow
          leading={<Avatar name="김민수" seed="m1" />}
          title="김민수"
          subtitle="A조 · 남자"
          trailing={<StatusChip tone="positive">참석</StatusChip>}
          href="/dev/ui-kit"
        />
        <ListRow
          leading={<Avatar name="이지은" seed="m2" />}
          title="이지은"
          subtitle="B조 · 여자"
          trailing={<StatusChip tone="warning">대기</StatusChip>}
          onClick={() => setSheetOpen(true)}
        />
        <ListRow
          leading={<Avatar name="박준호" seed="m3" />}
          title="박준호"
          subtitle="C조 · 남자"
          trailing={<StatusChip tone="negative">불참</StatusChip>}
        />
        <ListRow
          title="이번 달 회비 합계"
          trailing={
            <span className="text-callout font-semibold tabular-nums text-primary">
              1,320,000원
            </span>
          }
        />
      </ListGroup>

      <ListGroup label="아바타">
        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar name="김민수" size={28} />
          <Avatar name="이지은" />
          <Avatar name="박준호" size={56} />
          <Avatar name="최서연" seed="a" />
          <Avatar name="정우진" seed="b" />
          <Avatar name="한소희" seed="c" />
          <Avatar name="깨진 사진" src="https://example.invalid/x.jpg" />
        </div>
      </ListGroup>

      <ListGroup label="입력">
        <div className="space-y-4 px-4 py-4">
          <FormField label="이름" required>
            <Input placeholder="홍길동" autoComplete="name" />
          </FormField>
          <FormField label="전화번호" error="전화번호를 확인해주세요">
            <Input type="tel" defaultValue="010-1234" autoComplete="tel" />
          </FormField>
          <FormField label="급수">
            <Select
              options={[
                { value: 'A', label: 'A조' },
                { value: 'B', label: 'B조' },
              ]}
            />
          </FormField>
          <FormField label="남길 말">
            <Textarea placeholder="운영진에게 전할 말을 적어주세요" minRows={2} />
          </FormField>
          <label className="flex min-h-11 items-center text-body text-primary">
            <Checkbox />
            개인정보 수집에 동의합니다
          </label>
        </div>
      </ListGroup>

      <ListGroup label="세그먼트">
        <div className="px-4 py-4">
          <SegmentedControl<Filter>
            aria-label="회원 필터"
            options={[
              { value: 'all', label: '전체 445' },
              { value: 'active', label: '활동' },
              { value: 'unpaid', label: '미납' },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <p className="mt-2 text-footnote text-secondary">고른 값: {filter}</p>
        </div>
      </ListGroup>

      <ListGroup label="시트 · 확인창">
        <div className="space-y-3 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              시트 열기
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const ok = await confirm({
                  title: '게시글을 삭제할까요?',
                  message: '삭제하면 되돌릴 수 없어요.',
                  confirmLabel: '삭제',
                  destructive: true,
                });
                setLastConfirm(ok ? '삭제를 눌렀어요' : '취소했어요');
              }}
            >
              확인창 열기
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await confirm({ title: '신청이 마감됐어요', hideCancel: true });
                setLastConfirm('알림을 닫았어요');
              }}
            >
              알림창 열기
            </Button>
          </div>
          <p className="text-footnote text-secondary">
            마지막 결과: {lastConfirm}
          </p>
        </div>
      </ListGroup>

      <ListGroup label="불러오는 중 · 빈 화면">
        <div className="space-y-2 px-4 py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <EmptyState
          icon={CalendarX}
          title="이번 주 운동이 아직 없어요"
          description="일정이 올라오면 여기에 보여요"
          action={<Button variant="secondary">일정 만들기</Button>}
        />
      </ListGroup>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="게스트 신청"
        footer={
          <Button
            size="lg"
            className="w-full"
            onClick={() => setSheetOpen(false)}
          >
            신청하기
          </Button>
        }
      >
        <div className="space-y-4">
          {['이름', '전화번호', '소속 클럽', '급수', '방문 날짜', '남길 말'].map(
            (label) => (
              <FormField key={label} label={label}>
                <Input />
              </FormField>
            )
          )}
        </div>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 2: 사이트맵에서 빼기**

`next-sitemap.config.js`의 `exclude` 줄을 아래로 바꾼다.

```js
  exclude: ['/server-sitemap.xml', '/admin/*', '/dev/*', '/api/*', '/404', '/500'],
```

`next-sitemap.config.ts`에도 `exclude` 배열이 있으면 똑같이 `'/dev/*'`를 넣는다. 없으면 건드리지 않는다.

Run: `grep -n "exclude" next-sitemap.config.js next-sitemap.config.ts`
Expected: `exclude`가 있는 파일마다 `/dev/*`가 보인다.

- [ ] **Step 3: 타입 검사와 lint**

Run: `npx tsc --noEmit && npx next lint --file src/pages/dev/ui-kit.tsx`
Expected: 오류 없음. import 순서 경고는 `--fix`로 정렬한다.

- [ ] **Step 4: 눈으로 확인 — 휴대폰 폭**

Run: `npm run dev` 후 `http://localhost:3000/dev/ui-kit`. 개발자 도구에서 폭 390px.

| 확인 | 기대 |
| --- | --- |
| 바탕과 묶음 | 연회색 바탕 위에 흰 묶음, 모서리 12 |
| 버튼 | 주 버튼은 검정. 누르는 동안 살짝 흐려진다 |
| 입력칸 | 테두리가 보이고 높이 44. 누르면 테두리가 검정으로 |
| 오류 입력 | 빨강 테두리 + 아래에 빨강 문구 |
| 라벨 | "이름" 글자를 누르면 입력칸에 커서가 들어간다 |
| 아바타 | "깨진 사진"은 깨진 그림 아이콘 대신 "깨"가 보인다 |
| 시트 | "시트 열기" → 아래에서 올라온다. 내용이 길면 안쪽만 스크롤되고 "신청하기"는 아래에 고정 |
| 시트 닫기 | ✕, ESC, **바깥 어두운 곳 누르기** 세 가지 모두 닫힌다. 열린 동안 뒤 화면은 스크롤되지 않는다 |
| 확인창 | "삭제" 글자가 빨강. 취소·ESC·바깥 누르기 → "취소했어요" |

- [ ] **Step 5: 눈으로 확인 — PC 폭**

개발자 도구를 끄고 창 폭을 1024px 이상으로.

| 확인 | 기대 |
| --- | --- |
| 시트 | 화면 가운데에 모달로 뜬다 (아래에서 올라오지 않는다) |
| 작은 글자 | 맨 위 체크박스를 켜면 `text-body` 줄이 16px → 14px, `text-large-title`이 28px → 24px로 줄어든다. `text-footnote`·`text-caption`은 그대로 |
| 작은 글자 (휴대폰 폭) | 체크박스를 켠 채 폭을 390px로 줄이면 원래 크기로 돌아온다 |

- [ ] **Step 6: 기존 화면이 망가지지 않았는지 훑어보기**

로그인한 뒤 아래 화면을 390px 폭으로 한 번씩 연다. 디자인이 아직 옛것과 섞여 있는 것은 정상이다. **쓸 수 없게 된 곳**만 찾는다.

- `/clubs/1/attendance` — 참석 버튼이 눌리는가
- `/clubs/1/guest` → 신청 — 입력칸에 글자가 들어가고 제출 버튼이 보이는가
- `/clubs/1/board` → 글 하나 → 댓글 — 버튼 글자가 배경에 묻혀 안 보이는 곳이 없는가
- `/clubs/1/tournaments` → 대회 하나 → 신청 — 선수 추가·삭제 버튼이 보이는가
- `/clubs/1/custom` — 설정 폼 5개의 입력칸에 테두리가 보이는가 (Task 2에서 고친 곳)

글자가 배경에 묻힌 버튼이 있으면: 그 호출부가 `className`으로 예전 색(`text-white` 등)을 주고 있는 것이다. 그 `className`에서 색 클래스만 지운다.

- [ ] **Step 7: 전체 검증**

Run: `npx tsc --noEmit && npx jest && npm run build`
Expected: 셋 다 성공. 빌드 출력의 라우트 목록에 `/dev/ui-kit`이 `ƒ`(서버 렌더링)로 보인다.

- [ ] **Step 8: 운영 빌드에서 미리보기 화면이 막혔는지 확인**

Run: `npm run start` 후 다른 터미널에서 `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dev/ui-kit`
Expected: `404`

확인 후 서버를 끈다.

- [ ] **Step 9: 새 부품에 옛 색 이름이 섞이지 않았는지 확인**

```bash
grep -nE "(gray|blue|red|green|yellow|purple|pink|indigo|teal|orange)-[0-9]{2,3}|#[0-9a-fA-F]{3,6}" \
  src/components/atoms/buttons/Button.tsx \
  src/components/atoms/buttons/IconButton.tsx \
  src/components/atoms/inputs/Input.tsx \
  src/components/atoms/inputs/Select.tsx \
  src/components/atoms/inputs/Checkbox.tsx \
  src/components/atoms/Textarea.tsx \
  src/components/atoms/labels/Label.tsx \
  src/components/atoms/StatusChip.tsx \
  src/components/atoms/Avatar.tsx \
  src/components/atoms/Skeleton.tsx \
  src/components/molecules/form/FormField.tsx \
  src/components/molecules/list/ListGroup.tsx \
  src/components/molecules/list/ListRow.tsx \
  src/components/molecules/SegmentedControl.tsx \
  src/components/molecules/EmptyState.tsx \
  src/components/organisms/sheet/Sheet.tsx \
  src/components/organisms/sheet/ConfirmProvider.tsx \
  src/pages/dev/ui-kit.tsx
```

Expected: 출력 없음.

- [ ] **Step 10: 커밋**

```bash
git add src/pages/dev/ui-kit.tsx next-sitemap.config.js next-sitemap.config.ts
git commit -m "feat(ui): 부품 미리보기 화면(/dev/ui-kit) 추가"
```

---

## 이 계획이 끝나면

| 상태 | 내용 |
| --- | --- |
| 바뀐 것 | 글꼴, 화면 바탕, 모서리 둥글기, 버튼·입력칸 모양. 설정 폼의 깨져 있던 입력칸 |
| 아직 그대로 | 화면 배치, 메뉴, 화면마다 직접 쓴 색(`gray-`, `blue-`)과 원시 `<input>`, 기존 모달, `confirm()` |
| 다음 계획 (2단계 나머지) | 원시 입력 → 부품, `confirm()`·`alert()` → `useConfirm`, 기존 모달·시트 → `Sheet`, `GuestAvatar` → `Avatar` |
| 그다음 (3단계) | 하단 탭바, PC 사이드바, `PageHeader`, `Layout` 변형 |

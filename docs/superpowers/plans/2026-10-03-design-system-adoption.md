# 디자인 시스템 부품 적용 (2단계 나머지) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 화면에 흩어진 원시 입력 요소·`confirm()`/`alert()`·직접 만든 모달·`GuestAvatar`를 앞 계획에서 만든 부품으로 바꾼다.

**Architecture:** 화면 배치와 동작은 그대로 두고 요소만 부품으로 갈아 끼운다. 바꾼 뒤 옛 방식이 다시 들어오지 못하도록 소스를 읽어 검사하는 지킴이 테스트를 둔다. 부품에 없던 기능(자식으로 `<option>`을 받는 Select, 큰 글자를 허용하는 Input)은 부품을 먼저 넓힌다.

**Tech Stack:** Next.js 15 (pages router) · React 19 · Tailwind CSS 3.4 · @headlessui/react 2.2 · Jest 30 + @testing-library/react 16

**Spec:** `docs/superpowers/specs/2026-10-03-design-system-design.md` (4-1 공통 부품, 7장 2단계)
**앞 계획:** `docs/superpowers/plans/2026-10-03-design-system-foundation.md` (부품의 props는 그 문서의 Interfaces 블록 참고)

## 이 계획의 범위

| 포함 | 제외 (어느 단계에서 하는지) |
| --- | --- |
| `confirm()`·`alert()` 10곳 → `useConfirm` | `JoinModal`·`PrivacyModal`의 모달 구조 → 4단계 게스트 신청 화면 (겹친 모달과 인증 흐름을 함께 다시 짠다) |
| 운동 수정·삭제 시트, 대회 삭제·선수 수정 창 → `Sheet` | `OptionBottomSheet`·`ClubMemberCard` → 5단계 회원 관리 (PC 드롭다운과 한 묶음이다) |
| 원시 `<input>`·`<select>`·`<textarea>` → `Input`·`Checkbox`·`Select`·`Textarea` | `CircleMenu`·`SideMenu` → 3·4단계 |
| `GuestAvatar` → `Avatar` | 화면마다 직접 쓴 색(`gray-`, `blue-`)과 배치 → 4단계 |
| 앞 계획에서 미뤄 둔 것 중 눈에 띄는 것: Input이 큰 글자까지 16px로 내리는 문제 | 나머지 보류 항목 |

## Global Constraints

- 부품에는 색 값과 Tailwind 기본 색 이름을 쓰지 않는다. 토큰 클래스만 쓴다.
- 이 계획은 **요소만 바꾼다.** 화면 배치, 문구, 제출·검증 로직, API 호출은 건드리지 않는다. 예외는 각 과제에 적은 것뿐이다.
- 클래스 합치기는 `cn()`. 아이콘은 `lucide-react`.
- 테스트는 `@jest/globals`에서 가져오고 `@testing-library/jest-dom` 매처를 쓰지 않는다. 렌더링 테스트는 `*.dom.test.tsx`.
- 타입 검사: `npx tsc --noEmit` — `src/lib/sms-notification.test.ts`의 기존 오류 13건 외에 새 오류가 없어야 한다.
- 전체 테스트: `npx jest "$(pwd)/src"` — `src/lib/sms-notification.test.ts`의 기존 실패 6건 외에 실패가 없어야 한다. (맨 `npx jest`는 `.claude/worktrees` 안의 다른 폴더까지 돌린다.)
- `npm run build`는 마지막 과제에서만. 빌드가 바꾸는 `public/sw.js`·`workbox-*.js`는 커밋하지 않고 되돌린다.
- DB를 건드리지 않는다. `prisma` 명령을 실행하지 않는다.
- 커밋 메시지는 한국어 `refactor(ui): …` / `fix(ui): …`. AI 도구 서명을 넣지 않는다.
- 브랜치: `feat/design-system-foundation`에서 이어서 작업한다.

## 원시 요소를 부품으로 바꾸는 규칙

Task 5·6은 이 표를 따른다.

| 원래 | 바꾼 뒤 | 클래스 처리 |
| --- | --- | --- |
| `<input>` — `type`이 text·number·tel·email·date·time·password이거나 없음 | `<Input>` | 테두리·둥글기·안쪽 여백·글자 크기·색·포커스·그림자 클래스를 지운다. 폭·바깥 여백·정렬(`w-24`, `flex-1`, `mt-2`, `text-center`, `text-right`)만 남긴다. 고정 폭이면 `fullWidth={false}` |
| `<input type="checkbox">` | `<Checkbox>` | 모양 클래스를 지운다. `Checkbox`에 `mr-2`가 기본으로 있으니 겹치는 여백을 지운다 |
| `<input type="radio">` | 그대로 | 모양 클래스를 `h-5 w-5 accent-accent`로 바꾼다 |
| `<input type="hidden">`, `<input type="file">` | 그대로 | 건드리지 않는다 |
| `<input type="submit">` | `<Button type="submit">` | 값(`value`)을 자식 글자로 |
| `<select>` + 직접 쓴 `<option>` | `<Select placeholder={null}>` + 같은 `<option>` 자식 | Input과 같다 |
| `<textarea>` | `<Textarea>` | Input과 같다. `rows={n}`은 `minRows={n}`으로 |
| 바로 위의 `<label className="…text-sm…">` | `<Label>` (`@/components/atoms/labels/Label`) | 모양 클래스를 지운다. `htmlFor`·`id` 연결이 있으면 유지 |
| 입력 아래의 오류 문구 `<p className="…text-red-…">` | 클래스만 `text-footnote text-negative`로 | `mt-1` 같은 여백은 남긴다 |

- `ref`·`{...register()}`·`value`·`onChange`·`inputMode`·`autoComplete`·`placeholder`·`disabled`·`aria-*`·`data-*`는 모두 그대로 넘긴다.
- 기존 테스트가 실패하면 테스트가 옛 클래스 이름을 검사하는 경우에만 테스트를 고친다. 역할·글자·placeholder로 찾는 테스트가 실패하면 구현이 잘못된 것이다.

## Review Focus

1. **`Select`에 `<option>`을 자식으로 넘기는 화면에서 안내 항목이 끼어든다** — "전체"가 첫 항목인 필터에 "선택해주세요"가 덧붙으면 빈 값이 두 개가 된다. `placeholder={null}`이면 안내 항목이 없어야 한다. (Task 1)
2. **확인창이 뜬 사이 원래 화면이 바뀐다** — `confirm()`은 화면을 멈췄지만 `useConfirm`은 멈추지 않는다. 확인을 기다리는 동안 버튼을 또 눌러 삭제가 두 번 나가면 안 된다. (Task 2)
3. **시트에서 저장·삭제가 실패한다** — 오류 문구가 시트 안에 보이고 시트는 열린 채여야 한다. 진행 중에는 버튼이 다시 눌리지 않아야 한다. (Task 3, 4)
4. **대회 삭제 창에서 대회명 앞뒤에 공백을 넣어 입력한다** — 지금은 공백을 무시하고 일치로 본다. 바꾼 뒤에도 같아야 한다. (Task 4)
5. **숫자 입력을 비운다** — `type="number"` 칸을 지우면 값이 빈 문자열이다. 부품으로 바꾼 뒤에도 기존과 같은 값이 `onChange`로 나가야 한다. (Task 3)

---

## File Structure

| 파일 | 하는 일 | 과제 |
| --- | --- | --- |
| `src/components/atoms/inputs/Input.tsx`, `Select.tsx`, `src/components/atoms/Textarea.tsx` (수정) | 큰 글자 허용, Select가 자식 `<option>`을 받음 | 1 |
| `src/__tests__/guards/noNativeDialogs.test.ts` (신규) | `confirm(`·`alert(` 호출이 다시 생기지 않게 지킨다 | 2 |
| confirm/alert 호출부 8개 파일 (수정) | `useConfirm`으로 | 2 |
| `src/components/organisms/workout/{WorkoutDeleteSheet,WorkoutEditSheet}.tsx` (수정) | `Sheet` 기반으로 | 3 |
| `src/components/organisms/tournament/admin/{DeleteTournamentDialog,EditPlayersDialog}.tsx` (수정) | `Sheet` 기반으로 | 4 |
| `src/__tests__/guards/noRawControls.test.ts` (신규) | 원시 입력 요소·직접 만든 모달이 다시 생기지 않게 지킨다 | 5, 6 |
| 대회 관련 컴포넌트 8개 (수정) | 원시 요소 → 부품 | 5 |
| 그 밖의 화면·컴포넌트 12개 (수정) | 원시 요소 → 부품 | 6 |
| `src/components/molecules/PersonInfo.tsx` (수정), `src/components/atoms/GuestAvatar.tsx` (삭제) | 아바타 교체 | 7 |

---

### Task 1: Input이 큰 글자를 허용하고, Select가 자식 `<option>`을 받는다

**Files:**
- Modify: `src/components/atoms/inputs/Input.tsx`
- Modify: `src/components/atoms/inputs/Select.tsx`
- Modify: `src/components/atoms/Textarea.tsx`
- Test: `src/__tests__/components/ui/inputs.dom.test.tsx` (추가)

**Interfaces:**
- Produces:
  - `withMinBodyText(className?: string): string` (`Input.tsx`에서 내보냄) — 호출부 className에서 16px보다 작은 글자 크기 클래스만 지운다
  - `Select` props 변경: `options?: Array<{ value: string; label: string }>`(선택), `placeholder?: string | null`(기본 `'선택해주세요'`, `null`이면 안내 항목 없음), `children?: ReactNode`(`<option>`들. `options` 뒤에 그려진다)

**배경:** 지금 `Input`은 `text-body`를 맨 뒤에 붙여 호출부의 글자 크기를 무조건 이긴다. 인증번호 입력칸의 `text-lg`(18px)까지 16px로 줄어든다. 16px **아래로만** 내려가지 않게 하면 된다.

- [ ] **Step 1: 실패하는 테스트 추가**

`src/__tests__/components/ui/inputs.dom.test.tsx`의 `describe('Input', …)` 블록 맨 끝(닫는 `});` 앞)에 추가:

```tsx
  it('호출부가 16px보다 큰 글자를 주면 그 크기를 쓴다', () => {
    render(<Input placeholder="a" className="text-lg" />);

    const classes = screen.getByPlaceholderText('a').className.split(' ');
    expect(classes).toContain('text-lg');
    expect(classes).not.toContain('text-body');
  });

  it('반응형 접두어가 붙은 작은 글자도 지운다', () => {
    render(<Input placeholder="a" className="sm:text-sm text-xs w-24" />);

    const classes = screen.getByPlaceholderText('a').className.split(' ');
    expect(classes).toContain('text-body');
    expect(classes).toContain('w-24');
    expect(classes).not.toContain('sm:text-sm');
    expect(classes).not.toContain('text-xs');
  });

  it('글자색 클래스는 작은 글자로 오해해 지우지 않는다', () => {
    render(<Input placeholder="a" className="text-secondary text-center" />);

    const classes = screen.getByPlaceholderText('a').className.split(' ');
    expect(classes).toContain('text-secondary');
    expect(classes).toContain('text-center');
  });
```

`describe('Select', …)` 블록 맨 끝에 추가:

```tsx
  it('placeholder가 null이면 안내 항목을 그리지 않는다', () => {
    render(
      <Select aria-label="필터" placeholder={null}>
        <option value="">전체</option>
        <option value="A">A조</option>
      </Select>
    );

    const optionEls = screen.getByRole('combobox').querySelectorAll('option');
    expect(optionEls).toHaveLength(2);
    expect(optionEls[0].textContent).toBe('전체');
  });

  it('placeholder 글자를 바꿀 수 있다', () => {
    render(<Select aria-label="조" options={options} placeholder="선택" />);

    expect(
      screen.getByRole('combobox').querySelector('option')?.textContent
    ).toBe('선택');
  });

  it('options와 자식 option을 함께 주면 둘 다 그린다', () => {
    render(
      <Select aria-label="조" options={options} placeholder={null}>
        <option value="C">C조</option>
      </Select>
    );

    const labels = [
      ...screen.getByRole('combobox').querySelectorAll('option'),
    ].map((option) => option.textContent);
    expect(labels).toEqual(['A조', 'B조', 'C조']);
  });

  it('options도 자식도 없이 placeholder가 null이면 빈 선택칸을 그린다', () => {
    render(<Select aria-label="빈" placeholder={null} />);

    expect(screen.getByRole('combobox').querySelectorAll('option')).toHaveLength(
      0
    );
  });
```

`describe('Textarea', …)` 블록 맨 끝에 추가:

```tsx
  it('호출부가 작은 글자를 줘도 본문 크기를 지킨다', () => {
    render(<Textarea placeholder="내용" className="text-sm" />);

    const classes = screen.getByPlaceholderText('내용').className.split(' ');
    expect(classes).toContain('text-body');
    expect(classes).not.toContain('text-sm');
  });
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/ui/inputs.dom.test.tsx"`
Expected: FAIL — 큰 글자 테스트(`text-lg`가 없음), Select의 `placeholder`·`children` 테스트. Select 테스트는 타입 오류(`options` 필수)로 파일 전체가 실패할 수 있다. 어느 쪽이든 실패면 된다.

- [ ] **Step 3: `Input.tsx` 구현**

`inputClassName` 정의 아래에 추가하고, `Input`의 `className` 계산을 바꾼다.

```tsx
// 16px보다 작은 글자 크기 클래스. 반응형·상태 접두어(sm:, focus:)가 붙어도 잡는다.
const SMALL_TEXT = /^(?:[a-z0-9-]+:)*text-(?:xs|sm|caption|footnote|callout)$/;

/**
 * 호출부 className에서 16px보다 작은 글자 크기만 지운다.
 * 아이폰은 16px보다 작은 입력칸을 누르면 화면을 확대한다.
 * 더 큰 글자(text-lg 등)와 글자색은 그대로 둔다.
 */
export function withMinBodyText(className?: string): string {
  if (!className) return '';
  return className
    .split(/\s+/)
    .filter((cls) => cls && !SMALL_TEXT.test(cls))
    .join(' ');
}
```

```tsx
      className={cn(
        inputClassName,
        'text-body',
        fullWidth && 'w-full',
        withMinBodyText(className)
      )}
```

`text-body`를 맨 뒤에 두던 주석(“text-body를 맨 뒤에 둔다 …”)은 지운다.

- [ ] **Step 4: `Select.tsx` 전체 교체**

```tsx
import { forwardRef, ReactNode } from 'react';

import { inputClassName, withMinBodyText } from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string; label: string }>;
  /** 맨 앞의 안내 항목. null이면 그리지 않는다 ("전체"처럼 첫 항목을 직접 줄 때). */
  placeholder?: string | null;
  fullWidth?: boolean;
  /** 직접 쓴 <option>. options 뒤에 그려진다. */
  children?: ReactNode;
}

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      options,
      placeholder = '선택해주세요',
      fullWidth = true,
      className,
      children,
      ...props
    },
    ref
  ) {
    return (
      <select
        ref={ref}
        // select-chevron: 기본 화살표를 지우고 직접 그린다 (globals.css).
        className={cn(
          inputClassName,
          'select-chevron appearance-none pr-10 text-body',
          fullWidth && 'w-full',
          withMinBodyText(className)
        )}
        {...props}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    );
  }
);
```

- [ ] **Step 5: `Textarea.tsx`의 className 계산 교체**

```tsx
      className={cn(
        inputClassName,
        'h-auto min-h-11 w-full resize-none py-2.5 text-body',
        withMinBodyText(className)
      )}
```

import에 `withMinBodyText`를 더한다: `import { inputClassName, withMinBodyText } from '@/components/atoms/inputs/Input';`

- [ ] **Step 6: 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/ui/inputs.dom.test.tsx" && npx tsc --noEmit`
Expected: PASS (18개). 타입 검사는 기준선 외 오류 없음. 기존 테스트 "호출부가 글자를 작게 줘도 … text-body가 남는다"도 그대로 통과해야 한다.

- [ ] **Step 7: 커밋**

```bash
git add src/components/atoms/inputs src/components/atoms/Textarea.tsx src/__tests__/components/ui/inputs.dom.test.tsx
git commit -m "fix(ui): Input이 큰 글자를 허용하고 Select가 직접 쓴 option을 받게 함"
```

---

### Task 2: `confirm()` · `alert()` → `useConfirm`

**Files:**
- Create: `src/__tests__/guards/noNativeDialogs.test.ts`
- Modify (호출부):
  - `src/components/molecules/board/CommentItem.tsx:138`
  - `src/components/organisms/board/PostDetail.tsx:93`
  - `src/components/organisms/modal/join/JoinModal.tsx:124,131`
  - `src/components/organisms/tournament/admin/TournamentFileField.tsx:76`
  - `src/pages/clubs/[id]/guest/[guestId]/index.tsx:207`
  - `src/pages/clubs/[id]/attendance/index.tsx:113`
  - `src/pages/clubs/[id]/board/categories/index.tsx:41`
  - `src/pages/clubs/[id]/tournaments/[tournamentId]/my.tsx:28`
  - `src/pages/profile/index.tsx:109,112`

**Interfaces:**
- Consumes: `useConfirm(): (options: ConfirmOptions) => Promise<boolean>` — `{ title, message?, confirmLabel?, cancelLabel?, destructive?, hideCancel? }`

**바꾸는 규칙:**

| 원래 | 바꾼 뒤 |
| --- | --- |
| `if (confirm('정말 삭제하시겠습니까?')) { … }` | `if (await confirm({ title: '정말 삭제하시겠습니까?', confirmLabel: '삭제', destructive: true })) { … }` |
| `if (!window.confirm(msg)) return;` | `if (!(await confirm({ title: msg, … }))) return;` |
| `alert(msg);` | `await confirm({ title: msg, hideCancel: true });` |

- 컴포넌트 맨 위에 `const confirm = useConfirm();`을 둔다. 이 이름이 전역 `confirm`을 가리므로 그 파일 안의 호출은 모두 훅을 쓰게 된다.
- 삭제·취소처럼 되돌릴 수 없는 동작이면 `destructive: true`와 동작에 맞는 `confirmLabel`(`'삭제'`, `'신청 취소'` 등)을 준다. 그 밖에는 기본값.
- 문구는 바꾸지 않는다. 문구가 여러 줄(`\n`)이면 첫 줄을 `title`, 나머지를 `message`로 나눈다.
- 핸들러가 `async`가 아니면 `async`로 바꾼다. 폼 `onSubmit`은 `e.preventDefault()`가 `await`보다 **먼저** 와야 한다.
- **중복 실행 막기 (Review Focus 2):** `confirm()`과 달리 확인을 기다리는 동안 화면이 살아 있다. 이미 "진행 중" 상태(`isPending`, `isDeleting`, `deletingId` 등)로 버튼을 막는 곳은 그대로 두고, 그런 장치가 없는 삭제 핸들러에는 함수 맨 앞에서 확인창이 이미 떠 있는지를 `useRef(false)`로 막는다:

```tsx
const isConfirming = useRef(false);

const onClickDelete = async () => {
  if (isConfirming.current) return;
  isConfirming.current = true;
  try {
    if (!(await confirm({ title: '…', confirmLabel: '삭제', destructive: true }))) return;
    // 원래의 삭제 로직
  } finally {
    isConfirming.current = false;
  }
};
```

- [ ] **Step 1: 실패하는 지킴이 테스트 작성**

`src/__tests__/guards/noNativeDialogs.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/guards/noNativeDialogs.test.ts"`
Expected: FAIL — `offenders`에 위 9개 파일의 11줄이 나온다 (`ConfirmProvider.tsx`의 주석과 `ui-kit.tsx`는 나오지 않아야 한다. 나오면 정규식이 아니라 테스트를 고친다).

- [ ] **Step 3: 호출부를 하나씩 바꾼다**

파일마다: 해당 줄 주변을 읽고 → 위 규칙대로 바꾸고 → `import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';`를 더한다.

파일별로 정해 둔 것:

| 파일 | `title` | 그 밖 |
| --- | --- | --- |
| `CommentItem.tsx` | `'정말 삭제하시겠습니까?'` | `confirmLabel: '삭제', destructive: true` |
| `PostDetail.tsx` | `'정말 삭제하시겠습니까?'` | `confirmLabel: '삭제', destructive: true` |
| `board/categories/index.tsx` | `'정말 이 카테고리를 삭제하시겠습니까?'` | `confirmLabel: '삭제', destructive: true` |
| `TournamentFileField.tsx` | `` `'${fileName}'을(를) 삭제할까요?` `` | `confirmLabel: '삭제', destructive: true`. `deletingId`로 이미 버튼을 막는지 확인하고, 막지 않으면 `isConfirming` 추가 |
| `tournaments/[tournamentId]/my.tsx` | `` `'${label}' 종목 신청을 취소할까요?` `` | `confirmLabel: '신청 취소', cancelLabel: '닫기', destructive: true` ("취소"가 두 뜻으로 읽히지 않게) |
| `guest/[guestId]/index.tsx` | 기존 문구의 첫 줄 | 나머지 줄은 `message`. 기존 문구가 거절·삭제면 `destructive: true` |
| `JoinModal.tsx` 두 곳 | `phoneNumberError` / `'전화번호 인증을 완료해주세요.'` | `hideCancel: true`. `onSubmitForm`을 `async`로. `e.preventDefault()`는 첫 줄 그대로 |
| `attendance/index.tsx` | `result.error ?? '주차 신청에 실패했습니다.'` | `hideCancel: true` |
| `profile/index.tsx` 두 곳 | 기존 문구 | `hideCancel: true` |

- [ ] **Step 4: 지킴이 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/guards/noNativeDialogs.test.ts"`
Expected: PASS

- [ ] **Step 5: 타입 검사와 전체 테스트**

Run: `npx tsc --noEmit` / `npx jest "$(pwd)/src"`
Expected: 기준선 외 오류·실패 없음.

기존 테스트가 `useConfirm은 ConfirmProvider 안에서만 쓸 수 있습니다`로 실패하면, 그 테스트의 `render(...)`를 `<ConfirmProvider>`로 감싼다 (`JoinClubButton.dom.test.tsx`, `PhoneField.dom.test.tsx`가 `JoinModal`을 그리는지 확인).

- [ ] **Step 6: 커밋**

```bash
git add -A src
git commit -m "refactor(ui): confirm·alert를 useConfirm 확인창으로 교체"
```

---

### Task 3: 운동 수정·삭제 시트 → `Sheet`

**Files:**
- Modify: `src/components/organisms/workout/WorkoutDeleteSheet.tsx` (전체 교체)
- Modify: `src/components/organisms/workout/WorkoutEditSheet.tsx` (전체 교체)
- Test: `src/__tests__/components/workout/WorkoutSheets.dom.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `Button`, `Input`, `FormField`
- Produces: 두 컴포넌트의 props와 export는 **지금과 같다** (`WorkoutDeleteSheet({ title, participantCount, onConfirm, onClose })`, `WorkoutEditSheet({ workout, onSubmit, onClose })`, `type WorkoutEditValues`). 호출부(`attendance/index.tsx`)는 `{target && <…Sheet />}`로 조건부 렌더링하므로 건드리지 않는다. 안에서는 `open`을 늘 `true`로 준다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/workout/WorkoutSheets.dom.test.tsx`:

```tsx
import { ReactElement } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { WorkoutDeleteSheet } from '@/components/organisms/workout/WorkoutDeleteSheet';
import { WorkoutEditSheet } from '@/components/organisms/workout/WorkoutEditSheet';

import { Workout } from '@/types';

/** headlessui의 전환이 렌더 직후 상태를 한 번 더 바꾸므로 act 안에서 기다린다. */
async function renderSheet(ui: ReactElement) {
  await act(async () => {
    render(ui);
  });
}

async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

const workout: Workout = {
  id: 7,
  title: '토요 정기 운동',
  description: '셔틀콕 제공',
  date: new Date('2026-10-04T00:00:00Z'),
  startTime: new Date('2026-10-04T19:00:00Z'),
  endTime: new Date('2026-10-04T22:00:00Z'),
  maxParticipants: 24,
  location: '당산초 체육관',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
};

describe('WorkoutDeleteSheet', () => {
  it('대화상자로 뜨고 일정 이름을 보여 준다', async () => {
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog', { name: '운동 일정 삭제' })).toBeTruthy();
    expect(screen.getByText(/토요 정기 운동/)).toBeTruthy();
  });

  it('참여자가 있으면 몇 명의 기록이 지워지는지 알린다', async () => {
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={12}
        onConfirm={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/12명이 참여 중/)).toBeTruthy();
  });

  it('참여자가 없으면 그 안내를 보여 주지 않는다', async () => {
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText(/참여 중/)).toBeNull();
  });

  it('삭제를 누르면 onConfirm이 불린다', async () => {
    const onConfirm = jest.fn(async () => {});
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );

    await click('삭제');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('삭제에 실패하면 오류를 시트 안에 보여 주고 다시 누를 수 있다', async () => {
    const onConfirm = jest.fn(async () => {
      throw new Error('이미 삭제된 일정입니다.');
    });
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );

    await click('삭제');

    expect(screen.getByRole('alert').textContent).toBe(
      '이미 삭제된 일정입니다.'
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: '삭제' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });

  it('삭제가 진행되는 동안에는 다시 눌리지 않는다', async () => {
    let finish: () => void = () => {};
    const onConfirm = jest.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    );
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );

    await click('삭제');
    const pending = screen
      .getAllByRole('button')
      .find((button) => button.className.includes('text-negative'));
    expect((pending as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      fireEvent.click(pending as HTMLButtonElement);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
    });
  });

  it('취소와 ESC는 onClose를 부른다', async () => {
    const onClose = jest.fn();
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={async () => {}}
        onClose={onClose}
      />
    );

    await click('취소');
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('WorkoutEditSheet', () => {
  it('저장된 값으로 칸을 채우고, 라벨로 칸을 찾을 수 있다', async () => {
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog', { name: '운동 일정 수정' })).toBeTruthy();
    const value = (label: RegExp) =>
      (screen.getByLabelText(label) as HTMLInputElement).value;
    expect(value(/제목/)).toBe('토요 정기 운동');
    expect(value(/설명/)).toBe('셔틀콕 제공');
    expect(value(/날짜/)).toBe('2026-10-04');
    expect(value(/시작 시간/)).toBe('19:00');
    expect(value(/종료 시간/)).toBe('22:00');
    expect(value(/장소/)).toBe('당산초 체육관');
    expect(value(/최대 인원/)).toBe('24');
  });

  it('고친 값으로 onSubmit이 불린다', async () => {
    const onSubmit = jest.fn(async () => {});
    await renderSheet(
      <WorkoutEditSheet workout={workout} onSubmit={onSubmit} onClose={() => {}} />
    );

    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: '일요 번개' },
    });
    fireEvent.change(screen.getByLabelText(/최대 인원/), {
      target: { value: '16' },
    });
    await click('저장');

    expect(onSubmit).toHaveBeenCalledWith({
      title: '일요 번개',
      description: '셔틀콕 제공',
      date: '2026-10-04',
      startTime: '19:00',
      endTime: '22:00',
      location: '당산초 체육관',
      maxParticipants: 16,
    });
  });

  it('최대 인원을 비우면 지금처럼 0으로 나간다', async () => {
    const onSubmit = jest.fn(async () => {});
    await renderSheet(
      <WorkoutEditSheet workout={workout} onSubmit={onSubmit} onClose={() => {}} />
    );

    fireEvent.change(screen.getByLabelText(/최대 인원/), {
      target: { value: '' },
    });
    await click('저장');

    expect(onSubmit.mock.calls[0][0]).toMatchObject({ maxParticipants: 0 });
  });

  it('설명이 null인 일정도 빈 칸으로 열린다', async () => {
    await renderSheet(
      <WorkoutEditSheet
        workout={{ ...workout, description: null as unknown as string }}
        onSubmit={async () => {}}
        onClose={() => {}}
      />
    );

    expect((screen.getByLabelText(/설명/) as HTMLInputElement).value).toBe('');
  });

  it('저장에 실패하면 오류를 보여 주고 시트는 열린 채다', async () => {
    const onSubmit = jest.fn(async () => {
      throw new Error('종료 시간이 시작 시간보다 빠릅니다.');
    });
    await renderSheet(
      <WorkoutEditSheet workout={workout} onSubmit={onSubmit} onClose={() => {}} />
    );

    await click('저장');

    expect(screen.getByRole('alert').textContent).toBe(
      '종료 시간이 시작 시간보다 빠릅니다.'
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('입력칸의 글자는 16px 이상이다 (아이폰 확대 방지)', async () => {
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByLabelText(/제목/).className.split(' ')).toContain(
      'text-body'
    );
  });

  it('취소와 닫기 버튼은 onClose를 부른다', async () => {
    const onClose = jest.fn();
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={async () => {}}
        onClose={onClose}
      />
    );

    await click('취소');
    await click('닫기');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/workout/WorkoutSheets.dom.test.tsx"`
Expected: FAIL — `role="dialog"`를 찾지 못한다 (지금 구현에는 역할이 없다).

- [ ] **Step 3: `WorkoutDeleteSheet.tsx` 전체 교체**

```tsx
import { useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Sheet } from '@/components/organisms/sheet/Sheet';

interface WorkoutDeleteSheetProps {
  title: string;
  participantCount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * 운동 일정 삭제 확인 시트.
 * 참여자가 있어도 삭제할 수 있지만, 몇 명의 참여 기록이 함께 지워지는지 먼저 알린다.
 */
export function WorkoutDeleteSheet({
  title,
  participantCount,
  onConfirm,
  onClose,
}: WorkoutDeleteSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="운동 일정 삭제"
      hideCloseButton
      className="md:max-w-sm"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            pending={isDeleting}
            pendingText="삭제 중..."
            pendingPosition="left"
            onClick={handleConfirm}
          >
            삭제
          </Button>
        </div>
      }
    >
      <div className="space-y-1">
        <p className="text-body text-primary">
          &lsquo;{title}&rsquo; 일정을 삭제할까요?
        </p>
        {participantCount > 0 && (
          <p className="text-callout text-negative">
            이미 {participantCount}명이 참여 중입니다. 참여 기록도 함께
            삭제됩니다.
          </p>
        )}
        <p className="text-footnote text-secondary">되돌릴 수 없습니다.</p>
        {error && (
          <p className="pt-2 text-callout text-negative" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 4: `WorkoutEditSheet.tsx` 전체 교체**

제출 버튼은 시트의 고정 바닥 영역에 있고 폼은 본문에 있으므로, 버튼의 `form` 속성으로 폼과 잇는다.

```tsx
import { useId, useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { toDateInput, toTimeInput } from '@/lib/workout/datetime';
import { Workout } from '@/types';

export type WorkoutEditValues = {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number;
};

interface WorkoutEditSheetProps {
  workout: Workout;
  onSubmit: (values: WorkoutEditValues) => Promise<void>;
  onClose: () => void;
}

/**
 * 운동 일정 수정 시트.
 * 휴대폰에서는 화면 아래에서 올라오고, 넓은 화면에서는 가운데 창으로 보인다.
 */
export function WorkoutEditSheet({
  workout,
  onSubmit,
  onClose,
}: WorkoutEditSheetProps) {
  const formId = useId();
  const [values, setValues] = useState<WorkoutEditValues>({
    title: workout.title,
    description: workout.description ?? '',
    date: toDateInput(workout.date),
    startTime: toTimeInput(workout.startTime),
    endTime: toTimeInput(workout.endTime),
    location: workout.location,
    maxParticipants: workout.maxParticipants,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof WorkoutEditValues>(
    key: K,
    value: WorkoutEditValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="운동 일정 수정"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type="submit"
            form={formId}
            className="flex-1"
            pending={isSaving}
            pendingText="저장 중..."
            pendingPosition="left"
          >
            저장
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <FormField label="제목">
          <Input
            type="text"
            value={values.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </FormField>

        <FormField label="설명">
          <Input
            type="text"
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </FormField>

        <FormField label="날짜">
          <Input
            type="date"
            value={values.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="시작 시간">
            <Input
              type="time"
              value={values.startTime}
              onChange={(e) => update('startTime', e.target.value)}
            />
          </FormField>
          <FormField label="종료 시간">
            <Input
              type="time"
              value={values.endTime}
              onChange={(e) => update('endTime', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="장소">
          <Input
            type="text"
            value={values.location}
            onChange={(e) => update('location', e.target.value)}
          />
        </FormField>

        <FormField label="최대 인원">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={values.maxParticipants}
            onChange={(e) => update('maxParticipants', Number(e.target.value))}
          />
        </FormField>

        {error && (
          <p className="text-callout text-negative" role="alert">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
```

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/workout/WorkoutSheets.dom.test.tsx" && npx tsc --noEmit`
Expected: PASS (14개). 테스트 출력에 `console.error`(act 경고)가 없어야 한다.

"고친 값으로 onSubmit이 불린다"가 실패하면: jsdom은 `form` 속성으로 이어진 바깥 버튼의 클릭을 폼 제출로 이어 주지 않을 수 있다. 그 경우 테스트의 `await click('저장')`을 폼 제출로 바꾼다 —
`await act(async () => { fireEvent.submit(document.querySelector('form') as HTMLFormElement); });` — 그리고 브라우저에서 저장 버튼이 실제로 제출하는지는 Task 8에서 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src/components/organisms/workout/WorkoutDeleteSheet.tsx src/components/organisms/workout/WorkoutEditSheet.tsx src/__tests__/components/workout
git commit -m "refactor(ui): 운동 수정·삭제 시트를 Sheet 부품으로 교체"
```

---

### Task 4: 대회 삭제·선수 수정 창 → `Sheet`

**Files:**
- Modify: `src/components/organisms/tournament/admin/DeleteTournamentDialog.tsx` (전체 교체)
- Modify: `src/components/organisms/tournament/admin/EditPlayersDialog.tsx` (렌더 부분 교체)
- Test: `src/__tests__/components/tournament/AdminDialogs.dom.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `Button`, `Input`, `Select`(Task 1의 `placeholder`·`children`), `FormField`
- Produces: 두 컴포넌트의 props와 export는 **지금과 같다** (`DeleteTournamentDialog({ title, entryCount, isDeleting, onConfirm, onCancel })` default export, `EditPlayersDialog({ applicantName, players, tshirtSizes, isSaving, onSave, onCancel })` default export + `type EditablePlayer`).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/__tests__/components/tournament/AdminDialogs.dom.test.tsx`:

```tsx
import { ReactElement } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import DeleteTournamentDialog from '@/components/organisms/tournament/admin/DeleteTournamentDialog';
import EditPlayersDialog, {
  EditablePlayer,
} from '@/components/organisms/tournament/admin/EditPlayersDialog';

async function renderSheet(ui: ReactElement) {
  await act(async () => {
    render(ui);
  });
}

const button = (name: string) =>
  screen.getByRole('button', { name }) as HTMLButtonElement;

describe('DeleteTournamentDialog', () => {
  const props = {
    title: '2026 당산 클럽 대회',
    entryCount: 3,
    isDeleting: false,
    onConfirm: () => {},
    onCancel: () => {},
  };

  it('대화상자로 뜨고 함께 지워지는 신청 수를 알린다', async () => {
    await renderSheet(<DeleteTournamentDialog {...props} />);

    expect(
      screen.getByRole('dialog', { name: '대회를 삭제할까요?' })
    ).toBeTruthy();
    expect(screen.getByText('3건')).toBeTruthy();
  });

  it('신청이 없으면 신청 수 안내 없이 되돌릴 수 없다고만 알린다', async () => {
    await renderSheet(<DeleteTournamentDialog {...props} entryCount={0} />);

    expect(screen.queryByText(/건/)).toBeNull();
    expect(screen.getByText('되돌릴 수 없습니다.')).toBeTruthy();
  });

  it('대회명을 그대로 입력하기 전에는 삭제할 수 없다', async () => {
    const onConfirm = jest.fn();
    await renderSheet(<DeleteTournamentDialog {...props} onConfirm={onConfirm} />);

    expect(button('삭제').disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/대회명을 그대로 입력/), {
      target: { value: '2026 당산 클럽' },
    });
    expect(button('삭제').disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/대회명을 그대로 입력/), {
      target: { value: '2026 당산 클럽 대회' },
    });
    expect(button('삭제').disabled).toBe(false);

    fireEvent.click(button('삭제'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('앞뒤 공백은 무시하고 일치로 본다', async () => {
    await renderSheet(<DeleteTournamentDialog {...props} />);

    fireEvent.change(screen.getByLabelText(/대회명을 그대로 입력/), {
      target: { value: '  2026 당산 클럽 대회  ' },
    });
    expect(button('삭제').disabled).toBe(false);
  });

  it('삭제 중에는 삭제도 취소도 눌리지 않는다', async () => {
    await renderSheet(<DeleteTournamentDialog {...props} isDeleting />);

    fireEvent.change(screen.getByLabelText(/대회명을 그대로 입력/), {
      target: { value: '2026 당산 클럽 대회' },
    });
    expect(button('취소').disabled).toBe(true);
    const destructive = screen
      .getAllByRole('button')
      .find((el) => el.className.includes('text-negative'));
    expect((destructive as HTMLButtonElement).disabled).toBe(true);
  });

  it('취소를 누르면 onCancel이 불린다', async () => {
    const onCancel = jest.fn();
    await renderSheet(<DeleteTournamentDialog {...props} onCancel={onCancel} />);

    fireEvent.click(button('취소'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('EditPlayersDialog', () => {
  const players: EditablePlayer[] = [
    {
      id: 'p1',
      name: '김민수',
      gender: '남',
      birthDate: '1990-03-15',
      phoneNumber: '010-1234-5678',
      tshirtSize: 'L',
    },
  ];
  const props = {
    applicantName: '홍길동',
    players,
    tshirtSizes: ['M', 'L'],
    isSaving: false,
    onSave: () => {},
    onCancel: () => {},
  };

  it('대화상자로 뜨고 선수 정보를 칸에 채운다', async () => {
    await renderSheet(<EditPlayersDialog {...props} />);

    expect(screen.getByRole('dialog', { name: '선수 정보 수정' })).toBeTruthy();
    expect(screen.getByText(/홍길동 님의 외부 신청서/)).toBeTruthy();
    expect((screen.getByLabelText(/이름/) as HTMLInputElement).value).toBe(
      '김민수'
    );
    expect((screen.getByLabelText(/생년월일/) as HTMLInputElement).value).toBe(
      '19900315'
    );
    expect((screen.getByLabelText(/전화번호/) as HTMLInputElement).value).toBe(
      '010-1234-5678'
    );
    expect((screen.getByLabelText(/성별/) as HTMLSelectElement).value).toBe(
      '남'
    );
    expect((screen.getByLabelText(/티셔츠/) as HTMLSelectElement).value).toBe(
      'L'
    );
  });

  it('성별 선택칸의 첫 항목은 "선택" 하나뿐이다', async () => {
    await renderSheet(<EditPlayersDialog {...props} />);

    const labels = [
      ...(screen.getByLabelText(/성별/) as HTMLSelectElement).options,
    ].map((option) => option.textContent);
    expect(labels).toEqual(['선택', '남', '여']);
  });

  it('티셔츠 사이즈가 없는 대회면 티셔츠 칸을 그리지 않는다', async () => {
    await renderSheet(<EditPlayersDialog {...props} tshirtSizes={[]} />);

    expect(screen.queryByLabelText(/티셔츠/)).toBeNull();
  });

  it('이름을 비우면 오류를 보여 주고 저장할 수 없다', async () => {
    await renderSheet(<EditPlayersDialog {...props} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: ' ' } });

    expect(screen.getByText('선수 이름을 입력해주세요.')).toBeTruthy();
    expect(button('저장').disabled).toBe(true);
  });

  it('저장하면 생년월일·전화번호를 저장 형식으로 맞춰 넘긴다', async () => {
    const onSave = jest.fn();
    await renderSheet(<EditPlayersDialog {...props} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/이름/), {
      target: { value: '김민준' },
    });
    fireEvent.change(screen.getByLabelText(/전화번호/), {
      target: { value: '01099998888' },
    });
    fireEvent.change(screen.getByLabelText(/티셔츠/), {
      target: { value: '' },
    });
    fireEvent.click(button('저장'));

    expect(onSave).toHaveBeenCalledWith([
      {
        id: 'p1',
        name: '김민준',
        gender: '남',
        birthDate: '1990-03-15',
        phoneNumber: '010-9999-8888',
        tshirtSize: null,
      },
    ]);
  });

  it('선수가 여럿이면 선수마다 칸 묶음을 그린다', async () => {
    await renderSheet(
      <EditPlayersDialog
        {...props}
        players={[...players, { ...players[0], id: 'p2', name: '이지은' }]}
      />
    );

    expect(screen.getByText('선수 1')).toBeTruthy();
    expect(screen.getByText('선수 2')).toBeTruthy();
    expect(screen.getAllByLabelText(/이름/)).toHaveLength(2);
  });

  it('저장 중에는 저장도 취소도 눌리지 않는다', async () => {
    await renderSheet(<EditPlayersDialog {...props} isSaving />);

    expect(button('취소').disabled).toBe(true);
    const primary = screen
      .getAllByRole('button')
      .find((el) => el.className.includes('bg-accent'));
    expect((primary as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/tournament/AdminDialogs.dom.test.tsx"`
Expected: FAIL — `EditPlayersDialog`의 라벨이 입력과 이어져 있지 않아 `getByLabelText`가 실패한다. `DeleteTournamentDialog`는 지금도 `role="dialog"`와 라벨 연결이 있어 일부는 통과할 수 있다.

- [ ] **Step 3: `DeleteTournamentDialog.tsx` 전체 교체**

```tsx
import { useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';
import { Sheet } from '@/components/organisms/sheet/Sheet';

interface DeleteTournamentDialogProps {
  title: string;
  entryCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 대회 삭제 확인 창.
 * 되돌릴 수 없고 신청 내역까지 함께 사라지므로,
 * 대회명을 직접 입력해야 삭제되도록 해 실수를 막는다.
 */
function DeleteTournamentDialog({
  title,
  entryCount,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteTournamentDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText.trim() === title.trim();

  return (
    <Sheet
      open
      // 삭제가 진행되는 동안에는 ESC·바깥 누르기로 닫히지 않게 한다.
      onClose={isDeleting ? () => {} : onCancel}
      title="대회를 삭제할까요?"
      hideCloseButton
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={isDeleting}
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            disabled={!canDelete}
            pending={isDeleting}
            pendingText="삭제 중..."
            pendingPosition="left"
            onClick={onConfirm}
          >
            삭제
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1 rounded-md bg-negative-soft p-3 text-callout text-negative">
          <p className="font-semibold">{title}</p>
          {entryCount > 0 ? (
            <p>
              신청 <b>{entryCount}건</b>과 등록된 선수 정보가 함께 삭제됩니다.
              되돌릴 수 없습니다.
            </p>
          ) : (
            <p>되돌릴 수 없습니다.</p>
          )}
        </div>

        <FormField label="삭제하려면 대회명을 그대로 입력하세요.">
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={title}
            autoComplete="off"
          />
        </FormField>
      </div>
    </Sheet>
  );
}

export default DeleteTournamentDialog;
```

- [ ] **Step 4: `EditPlayersDialog.tsx`의 import와 `return` 부분 교체**

파일 맨 위 import에 추가:

```tsx
import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';
import { Sheet } from '@/components/organisms/sheet/Sheet';
```

`const hasError = …;` 아래의 `return ( … );` 전체를 아래로 바꾼다. 그 위의 상태·`update`·`errors` 계산은 그대로 둔다.

```tsx
  return (
    <Sheet
      open
      // 저장이 진행되는 동안에는 ESC·바깥 누르기로 닫히지 않게 한다.
      onClose={isSaving ? () => {} : onCancel}
      title="선수 정보 수정"
      hideCloseButton
      className="md:max-w-lg"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={isSaving}
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={hasError}
            pending={isSaving}
            pendingText="저장 중..."
            pendingPosition="left"
            onClick={() =>
              onSave(
                // 저장 포맷으로 맞춰 보낸다. 서버도 같은 정규화를 한 번 더 한다.
                draft.map((player) => ({
                  ...player,
                  birthDate: toIsoBirthDate(player.birthDate),
                  phoneNumber: formatPhoneNumber(player.phoneNumber),
                }))
              )
            }
          >
            저장
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-callout text-secondary">
          {applicantName} 님의 외부 신청서입니다. 참가비와 신청 종목은 바뀌지
          않습니다.
        </p>

        {draft.map((player, index) => (
          <div
            key={player.id}
            className="space-y-3 rounded-md border border-border p-3"
          >
            <p className="text-callout font-semibold text-primary">
              선수 {index + 1}
            </p>

            <FormField label="이름" error={errors[index].name}>
              <Input
                type="text"
                value={player.name}
                onChange={(e) => update(index, { name: e.target.value })}
              />
            </FormField>

            <FormField label="성별" error={errors[index].gender}>
              <Select
                placeholder="선택"
                options={GENDER_OPTIONS}
                value={player.gender}
                onChange={(e) => update(index, { gender: e.target.value })}
              />
            </FormField>

            <FormField label="생년월일" error={errors[index].birthDate}>
              <Input
                type="text"
                inputMode="numeric"
                value={toBirthDateDigits(player.birthDate)}
                onChange={(e) =>
                  update(index, {
                    birthDate: toBirthDateDigits(e.target.value),
                  })
                }
                placeholder="예: 19900315"
              />
            </FormField>

            <FormField label="전화번호" error={errors[index].phoneNumber}>
              <Input
                type="text"
                inputMode="numeric"
                value={formatPhoneNumber(player.phoneNumber)}
                onChange={(e) =>
                  update(index, {
                    phoneNumber: toPhoneDigits(e.target.value),
                  })
                }
                placeholder="010-1234-5678"
              />
            </FormField>

            {useTshirt && (
              <FormField label="티셔츠">
                <Select
                  placeholder="선택 안 함"
                  options={tshirtSizes.map((size) => ({
                    value: size,
                    label: size,
                  }))}
                  value={player.tshirtSize ?? ''}
                  onChange={(e) =>
                    update(index, { tshirtSize: e.target.value || null })
                  }
                />
              </FormField>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
```

- [ ] **Step 5: 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/tournament/AdminDialogs.dom.test.tsx" && npx tsc --noEmit`
Expected: PASS (13개), `console.error` 없음.

`FormField`의 `error`는 `role="alert"`인 `<p>`로 그려진다. 오류 문구 테스트는 글자로 찾으므로 그대로 통과한다.

- [ ] **Step 6: 커밋**

```bash
git add src/components/organisms/tournament/admin/DeleteTournamentDialog.tsx src/components/organisms/tournament/admin/EditPlayersDialog.tsx src/__tests__/components/tournament/AdminDialogs.dom.test.tsx
git commit -m "refactor(ui): 대회 삭제·선수 수정 창을 Sheet 부품으로 교체"
```

---

### Task 5: 원시 입력 요소 → 부품 (대회 관련 컴포넌트)

**Files:**
- Create: `src/__tests__/guards/noRawControls.test.ts`
- Modify (모두 `src/components/organisms/tournament/` 아래):
  - `admin/TournamentForm.tsx` — input 5 (text 1, checkbox 2, radio 2), select 1, textarea 2
  - `admin/EventTypeEditor.tsx` — input 2 (number 1, hidden 1), select 1
  - `admin/TagListField.tsx` — input 1 (text)
  - `admin/PresetOrCustomInput.tsx` — input 1, select 1
  - `admin/EntryTable.tsx` — select 1
  - `admin/TournamentFileField.tsx` — input 1 (file: 그대로 둔다)
  - `entry/PlayerListField.tsx` — input 2 (checkbox 1, hidden 1)
  - `entry/EntrySummary.tsx` — input 1 (checkbox)

**Interfaces:**
- Consumes: `Input`, `Checkbox`, `Select`(`placeholder`·`children`), `Textarea`, `Label`
- Produces: `findRawControls(dir: string): string[]`·`findHandMadeOverlays(dir: string): string[]` — 지킴이 테스트 안의 도우미. Task 6이 검사 범위를 넓힌다.

위의 **"원시 요소를 부품으로 바꾸는 규칙"** 표를 그대로 따른다.

- [ ] **Step 1: 실패하는 지킴이 테스트 작성**

`src/__tests__/guards/noRawControls.test.ts`:

```ts
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
    const tagPattern = /<(input|select|textarea)\b([^>]*)>/gs;
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/guards/noRawControls.test.ts"`
Expected: "대회 컴포넌트는 …"가 FAIL — 위 파일들의 text·number·checkbox input, select, textarea가 나온다. radio·hidden·file은 나오지 않아야 한다. "화면을 덮는 막은 …"은 Task 3·4가 끝났으므로 PASS여야 한다. FAIL이면 나온 파일이 정말 미뤄 둔 것인지 확인하고, 아니면 Task 3·4에서 빠뜨린 것이다.

- [ ] **Step 3: 파일을 하나씩 바꾼다**

파일마다: 전체를 읽고 → 규칙 표대로 바꾸고 → 그 파일의 기존 테스트를 돌린다.

| 파일 | 기존 테스트 |
| --- | --- |
| `admin/TagListField.tsx` | `src/__tests__/components/tournament/TagListField.dom.test.tsx` |
| `admin/EntryTable.tsx` | `src/__tests__/components/tournament/EntryTable.dom.test.tsx` |
| `entry/PlayerListField.tsx` | `src/__tests__/components/tournament/PlayerListField.dom.test.tsx` |
| `entry/EntrySummary.tsx` | `src/__tests__/components/tournament/EntrySummary.dom.test.tsx` |
| `admin/TournamentForm.tsx`, `EventTypeEditor.tsx`, `PresetOrCustomInput.tsx` | 없음. `EventListField.dom.test.tsx`가 `EventTypeEditor`를 간접으로 그리는지 확인 |

주의할 것:
- `EntryTable`의 select는 표 안의 작은 상태 선택칸이다. `fullWidth={false}`와 원래의 폭 클래스를 남긴다.
- `PresetOrCustomInput`은 select와 input이 한 줄에 나란히 있다. 둘의 `flex-*`·폭 클래스를 남긴다.
- radio 두 개(`TournamentForm`)는 요소를 그대로 두고 모양 클래스만 `h-5 w-5 accent-accent`로 바꾼다.

- [ ] **Step 4: 지킴이 테스트와 대회 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/guards" "$(pwd)/src/__tests__/components/tournament" && npx tsc --noEmit`
Expected: PASS. 타입 검사 기준선 외 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add -A src
git commit -m "refactor(ui): 대회 화면의 원시 입력 요소를 부품으로 교체"
```

---

### Task 6: 원시 입력 요소 → 부품 (나머지 화면)

**Files:**
- Modify: `src/__tests__/guards/noRawControls.test.ts` (검사 범위를 `src` 전체로)
- Modify:
  - `src/pages/profile/index.tsx` — input 9 (text 4, tel 3, email 1, date 1), select 2
  - `src/pages/clubs/[id]/guest/index.tsx`, `guest/check/index.tsx`, `guest/[guestId]/index.tsx` — checkbox 각 1, `check`에 select 2
  - `src/pages/clubs/[id]/workouts/[workoutId].tsx`, `tournaments/[tournamentId]/admin.tsx`, `members/index.tsx`, `board/index.tsx` — select 각 1
  - `src/components/organisms/board/CategoryManageForm.tsx` — input 5 (text 1, number 1, checkbox 3 중 submit 1 포함), textarea 1
  - `src/components/organisms/forms/ParkingSettingsForm.tsx` — input 4 (checkbox 2, number 2)
  - `src/components/organisms/workout/WorkoutParkingSection.tsx` — input 2 (checkbox 1, number 1)
  - `src/components/organisms/modal/join/components/fields/GenderField.tsx` — radio 2 (모양만)
  - `src/components/organisms/modal/join/components/fields/MessageField.tsx` — textarea 1

위의 **"원시 요소를 부품으로 바꾸는 규칙"** 표를 그대로 따른다.

- [ ] **Step 1: 지킴이 테스트의 범위를 넓힌다 (실패하게)**

`noRawControls.test.ts`의 `describe('원시 입력 요소', …)` 블록을 아래로 바꾼다.

```ts
describe('원시 입력 요소', () => {
  it('input·select·textarea를 직접 쓰지 않는다 (radio·hidden·file 제외)', () => {
    expect(findRawControls(SRC)).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/guards/noRawControls.test.ts"`
Expected: FAIL — 위 파일들이 나온다. **위 목록에 없는 파일이 나오면** 그 파일도 이 과제에서 같은 규칙으로 바꾼다 (조사 뒤에 생긴 것이다).

- [ ] **Step 3: 파일을 하나씩 바꾼다**

주의할 것:
- `profile/index.tsx`의 전화번호 3칸은 가로로 나란하다. 칸마다 `fullWidth={false}`와 원래의 폭(`w-*`)·`text-center`를 남긴다. 화면 폭 360px에서 한 줄에 들어가야 한다.
- 필터용 select(`members`, `board`, `guest/check`, `workouts/[workoutId]`, `tournaments/admin`)는 첫 항목이 "전체" 같은 직접 쓴 `<option>`이다. 반드시 `placeholder={null}`.
- `CategoryManageForm`의 `<input type="submit">`은 `<Button type="submit">`으로. `value`의 글자를 자식으로 옮긴다.
- 체크박스 옆 글자가 `<label>`로 감싸져 있지 않으면 `<label className="flex min-h-11 items-center …">`로 감싸 글자를 눌러도 체크되게 한다. 이것은 이 계획에서 허용하는 유일한 구조 변경이다.
- `GenderField`의 radio는 요소를 그대로 두고 모양 클래스만 바꾼다.

- [ ] **Step 4: 지킴이 테스트와 전체 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/guards" && npx tsc --noEmit && npx jest "$(pwd)/src"`
Expected: 지킴이 PASS, 타입·전체 테스트 기준선 외 오류·실패 없음.

- [ ] **Step 5: 커밋**

```bash
git add -A src
git commit -m "refactor(ui): 나머지 화면의 원시 입력 요소를 부품으로 교체"
```

---

### Task 7: `GuestAvatar` → `Avatar`

**Files:**
- Modify: `src/components/molecules/PersonInfo.tsx` (`renderAvatar` 함수와 import)
- Delete: `src/components/atoms/GuestAvatar.tsx`
- Test: `src/__tests__/components/ui/PersonInfo.dom.test.tsx`

**Interfaces:**
- Consumes: `Avatar({ name, src?, seed?, size?, className? })`
- Produces: `PersonInfo`의 props는 지금과 같다.

**바꾸는 것:** `renderAvatar`는 지금 세 갈래다 — ① `guestId`가 있으면 `GuestAvatar` ② `thumbnailImageUrl`이 있으면 `next/image` ③ 둘 다 없으면 첫 글자 원. 세 갈래를 `Avatar` 하나로 합친다. `Avatar`가 사진·첫 글자·깨진 사진을 모두 처리한다.

- [ ] **Step 1: `PersonInfo.tsx` 전체를 읽는다**

`renderAvatar`의 세 갈래가 쓰는 크기 클래스(`w-10 h-10` 등)와 `avatarClassName`·`initial`이 어떻게 쓰이는지 확인한다. `initial` prop이 이름 첫 글자와 다른 글자를 넘기는 호출부가 있는지 찾는다:

```bash
grep -rn "initial=" src --include='*.tsx' | grep -v __tests__
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/__tests__/components/ui/PersonInfo.dom.test.tsx`:

```tsx
import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import PersonInfo from '@/components/molecules/PersonInfo';

describe('PersonInfo의 아바타', () => {
  it('사진이 없으면 이름 첫 글자를 토큰 색 바탕에 보여 준다', () => {
    render(<PersonInfo name="김민수" />);

    const avatar = screen.getByRole('img', { name: '김민수' });
    expect(avatar.textContent).toBe('김');
    expect(avatar.className).toMatch(/bg-avatar-[1-6]/);
  });

  it('게스트는 같은 guestId면 언제나 같은 색이다', () => {
    const { unmount } = render(<PersonInfo name="박준호" guestId="guest-42" />);
    const first = screen.getByRole('img', { name: '박준호' }).className;
    unmount();

    render(<PersonInfo name="박준호" guestId="guest-42" />);
    expect(screen.getByRole('img', { name: '박준호' }).className).toBe(first);
  });

  it('사진 주소가 있으면 사진을 보여 준다', () => {
    render(
      <PersonInfo name="이지은" thumbnailImageUrl="https://example.com/a.jpg" />
    );

    const img = screen.getByRole('img', { name: '이지은' });
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('https://example.com/a.jpg');
  });

  it('사진을 못 불러오면 첫 글자로 바꾼다', () => {
    render(
      <PersonInfo
        name="이지은"
        thumbnailImageUrl="https://example.com/expired.jpg"
      />
    );

    fireEvent.error(screen.getByRole('img'));

    expect(screen.getByRole('img', { name: '이지은' }).textContent).toBe('이');
  });

  it('옛 색 클래스(bg-purple-500 등)를 쓰지 않는다', () => {
    const { container } = render(<PersonInfo name="김민수" guestId="g1" />);

    expect(container.innerHTML).not.toMatch(
      /bg-(purple|pink|indigo|blue|teal|green|yellow|orange)-500/
    );
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/ui/PersonInfo.dom.test.tsx"`
Expected: FAIL — `role="img"`인 첫 글자 요소가 없고, 게스트는 `bg-purple-500` 같은 옛 색을 쓴다. 사진 테스트는 `next/image`가 주소를 `/_next/image?url=…`로 바꿔 `src`가 달라 실패한다.

- [ ] **Step 4: `renderAvatar` 교체**

`GuestAvatar` import와 (다른 곳에서 쓰지 않으면) `next/image` import를 지우고 `Avatar`를 가져온다.

```tsx
import { Avatar } from '@/components/atoms/Avatar';
```

```tsx
  // 아바타 렌더링 함수
  const renderAvatar = () => (
    <Avatar
      name={name}
      src={thumbnailImageUrl}
      // 게스트는 이름이 같아도 색이 달라지도록 id로 색을 고른다.
      seed={guestId}
      className={cn('h-10 w-10 text-callout', avatarClassName)}
    />
  );
```

- `cn` import가 없으면 더한다: `import { cn } from '@/lib/utils';`
- 크기는 Step 1에서 확인한 기존 크기를 따른다. 기존이 `w-10 h-10`이면 위 그대로, 다르면 그 값으로.
- `initial` prop: Step 1의 grep에서 이름 첫 글자와 다른 글자를 넘기는 호출부가 **없으면** 쓰이지 않는 변수 `displayInitial`을 지운다. **있으면** 멈추고 그 호출부를 본다 — `Avatar`는 이름에서 첫 글자를 뽑으므로, 그 글자를 살리려면 `Avatar`의 `name`에 무엇을 넘길지 정해야 한다.

- [ ] **Step 5: `GuestAvatar.tsx` 삭제**

```bash
grep -rn "GuestAvatar" src --include='*.tsx' --include='*.ts'
```

Expected: `src/components/atoms/GuestAvatar.tsx` 자신만 나온다. 그러면 지운다.

```bash
git rm src/components/atoms/GuestAvatar.tsx
```

- [ ] **Step 6: 테스트가 통과하는지 확인**

Run: `npx jest "$(pwd)/src/__tests__/components/ui/PersonInfo.dom.test.tsx" && npx tsc --noEmit`
Expected: PASS (5개), 기준선 외 타입 오류 없음.

- [ ] **Step 7: 커밋**

```bash
git add -A src
git commit -m "refactor(ui): PersonInfo의 아바타를 Avatar 부품으로 통일"
```

---

### Task 8: 마지막 검증

**Files:** 없음 (검증만). 문제가 나오면 해당 과제의 파일을 고치고 테스트를 더한다.

- [ ] **Step 1: 전체 검증**

Run: `npx tsc --noEmit` / `npx jest "$(pwd)/src"` / `npm run build`
Expected: 타입·테스트는 기준선 외 오류·실패 없음. 빌드 성공.

빌드 뒤: `git checkout -- public/ && git clean -fq public/`

- [ ] **Step 2: 옛 방식이 남았는지 세어 본다**

```bash
grep -rnE "(^|[^a-zA-Z.])(window\.)?(confirm|alert)\(" src --include='*.tsx' --include='*.ts' | grep -v "__tests__\|const confirm = useConfirm\|await confirm(\|ConfirmProvider" | wc -l
grep -rlE "fixed inset-0" src --include='*.tsx' | wc -l
```

Expected: 첫째 0. 둘째 6 (`Sheet` + 미뤄 둔 5개).

- [ ] **Step 3: 브라우저에서 확인 (로그인 없이 볼 수 있는 화면)**

`npx next dev -p 3111`로 띄우고 폭 390px에서:

| 화면 | 확인 |
| --- | --- |
| `/dev/ui-kit` | 선택칸에 화살표 하나, 큰 글자 입력칸이 있다면 그 크기 유지 |
| `/`, `/auth/login`, `/clubs/1` | 페이지 오류 없음, 가로 스크롤 없음 |

- [ ] **Step 4: 로그인이 필요한 화면 — 사용자 확인 항목으로 넘긴다**

아래는 카카오 로그인이 있어야 열린다. 실행자가 열 수 없으면 최종 보고에 "직접 봐 주세요" 목록으로 적는다.

| 화면 | 확인할 것 |
| --- | --- |
| 출석체크 → 운동 일정 수정·삭제 (운영진) | 시트가 아래에서 올라오고, 저장 버튼이 실제로 저장한다 |
| 게시판 → 글·댓글 삭제 | 확인창이 뜨고, 취소하면 지워지지 않는다 |
| 게스트 신청 폼 | 전화번호를 틀리게 넣고 신청하면 안내 창이 뜬다 |
| 내 정보 | 전화번호 3칸이 한 줄에 들어간다. 저장하면 안내 창이 뜬다 |
| 대회 운영 → 선수 수정·대회 삭제 | 창이 뜨고 저장·삭제가 된다 |
| 회원·게시판·게스트 확인의 필터 | 선택칸의 첫 항목이 "전체"이고 "선택해주세요"가 없다 |

---

## 이 계획이 끝나면

| 상태 | 내용 |
| --- | --- |
| 바뀐 것 | 모든 입력 요소가 부품, 확인창이 앱 모양, 운동·대회 관리 창이 시트, 아바타 색 통일 |
| 아직 그대로 | 화면 배치와 색, 메뉴, 게스트 신청 모달, 회원 상태 변경 시트 |
| 다음 (3단계) | 하단 탭바, PC 사이드바, `PageHeader`, `Layout` 변형 |

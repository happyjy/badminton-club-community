import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import { OptionPicker } from '@/components/molecules/OptionPicker';

const OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'views', label: '조회수순' },
  { value: 'likes', label: '좋아요순' },
];

/** PC 폭인 척한다. 없애면 휴대폰(시트)로 동작한다. */
function mockDesktop() {
  (window as unknown as { matchMedia: unknown }).matchMedia = (
    query: string
  ) => ({ matches: query.includes('min-width: 1024px') });
}

afterEach(() => {
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

const trigger = () => screen.getByRole('button', { name: '정렬: 최신순' });
const open = async () => {
  await act(async () => {
    fireEvent.click(trigger());
  });
};

function renderPicker(onChange = jest.fn()) {
  render(
    <OptionPicker
      aria-label="정렬"
      options={OPTIONS}
      value="latest"
      onChange={onChange}
    />
  );
  return onChange;
}

describe('OptionPicker — 버튼', () => {
  it('지금 고른 값을 글자로 보여 주고, 무엇을 고르는지 이름에 담는다', () => {
    renderPicker();

    expect(trigger().textContent).toBe('최신순');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('입력칸처럼 보이지 않는다 (원시 select를 쓰지 않는다)', () => {
    const { container } = render(
      <OptionPicker
        aria-label="정렬"
        options={OPTIONS}
        value="latest"
        onChange={() => {}}
      />
    );
    expect(container.querySelector('select')).toBeNull();
  });

  it('value가 어느 항목과도 맞지 않으면 무엇을 고르는지를 대신 보여 준다', () => {
    render(
      <OptionPicker
        aria-label="정렬"
        options={OPTIONS}
        value={'none' as string}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: '정렬' }).textContent).toBe(
      '정렬'
    );
  });
});

describe('OptionPicker — 휴대폰 (아래 시트)', () => {
  it('누르면 제목이 붙은 시트가 열리고 항목이 모두 보인다', async () => {
    renderPicker();
    await open();

    const dialog = screen.getByRole('dialog', { name: '정렬' });
    expect(
      within(dialog)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['최신순', '조회수순', '좋아요순']);
  });

  it('지금 고른 항목만 선택된 것으로 표시한다', async () => {
    renderPicker();
    await open();

    expect(
      screen
        .getAllByRole('option')
        .map((option) => option.getAttribute('aria-selected'))
    ).toEqual(['true', 'false', 'false']);
  });

  it('항목을 누르면 그 값을 알리고 시트를 닫는다', async () => {
    const onChange = renderPicker();
    await open();

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: '좋아요순' }));
    });

    expect(onChange).toHaveBeenCalledWith('likes');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('이미 고른 항목을 누르면 값은 알리지 않고 닫기만 한다', async () => {
    const onChange = renderPicker();
    await open();

    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: '최신순' }));
    });

    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('OptionPicker — PC (버튼 아래 메뉴)', () => {
  it('시트가 아니라 버튼 아래의 목록으로 열린다', async () => {
    mockDesktop();
    renderPicker();
    await open();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('listbox', { name: '정렬' })).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('열리면 지금 고른 항목에 초점이 간다', async () => {
    mockDesktop();
    renderPicker();
    await open();

    expect(document.activeElement).toBe(
      screen.getByRole('option', { name: '최신순' })
    );
  });

  it('방향키로 옮기고 Enter(클릭)로 고른다', async () => {
    mockDesktop();
    const onChange = renderPicker();
    await open();

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('option', { name: '조회수순' })
    );
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(
      screen.getByRole('option', { name: '좋아요순' })
    );

    fireEvent.click(document.activeElement as HTMLElement);
    expect(onChange).toHaveBeenCalledWith('likes');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('ESC를 누르면 닫히고 초점이 버튼으로 돌아온다', async () => {
    mockDesktop();
    renderPicker();
    await open();

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('바깥을 누르면 닫힌다', async () => {
    mockDesktop();
    renderPicker();
    await open();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('버튼을 다시 누르면 닫힌다', async () => {
    mockDesktop();
    renderPicker();
    await open();
    await open();

    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

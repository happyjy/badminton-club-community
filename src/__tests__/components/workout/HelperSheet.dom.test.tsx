import { ReactElement } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import {
  HELPER_OPTIONS,
  HelperIcons,
  HelperSheet,
} from '@/components/organisms/workout/HelperSheet';

async function renderSheet(ui: ReactElement) {
  await act(async () => {
    render(ui);
  });
}

describe('HELPER_OPTIONS', () => {
  it('다섯 가지이고 서버에 보내는 값의 이름과 순서가 고정이다', () => {
    expect(HELPER_OPTIONS.map((option) => option.value)).toEqual([
      'net',
      'broomStick',
      'shuttlecock',
      'key',
      'mop',
    ]);
  });

  it('항목마다 사람이 읽을 이름이 있다', () => {
    expect(HELPER_OPTIONS.map((option) => option.label)).toEqual([
      '네트 설치',
      '바닥 청소',
      '셔틀콕 정리',
      '열쇠',
      '걸레질',
    ]);
  });
});

describe('HelperIcons', () => {
  it('넘긴 순서대로 그림을 그리고, 그림마다 이름이 붙는다', () => {
    render(<HelperIcons icons={['key', 'net']} />);

    expect(
      screen.getAllByRole('img').map((img) => img.getAttribute('alt'))
    ).toEqual(['열쇠', '네트 설치']);
  });

  it('없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<HelperIcons icons={[]} />);

    expect(container.innerHTML).toBe('');
  });
});

describe('HelperSheet', () => {
  const base = {
    open: true,
    onClose: () => {},
    name: '김민수',
    selected: [] as Array<(typeof HELPER_OPTIONS)[number]['value']>,
    onToggle: () => {},
  };

  it('누구의 기록인지 제목으로 알려 주고 다섯 항목을 이름과 함께 보여 준다', async () => {
    await renderSheet(<HelperSheet {...base} />);

    const dialog = screen.getByRole('dialog', { name: '김민수님의 도움 기록' });
    for (const { label } of HELPER_OPTIONS) {
      expect(within(dialog).getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('이미 한 도움만 눌린 상태로 보인다', async () => {
    await renderSheet(<HelperSheet {...base} selected={['net', 'mop']} />);

    const pressed = HELPER_OPTIONS.filter(
      ({ label }) =>
        screen
          .getByRole('button', { name: label })
          .getAttribute('aria-pressed') === 'true'
    ).map((option) => option.value);
    expect(pressed).toEqual(['net', 'mop']);
  });

  it('항목을 누르면 그 값으로 onToggle이 불리고 시트는 열린 채다', async () => {
    const onToggle = jest.fn();
    const onClose = jest.fn();
    await renderSheet(
      <HelperSheet {...base} onToggle={onToggle} onClose={onClose} />
    );

    fireEvent.click(screen.getByRole('button', { name: '셔틀콕 정리' }));

    expect(onToggle).toHaveBeenCalledWith('shuttlecock');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('"완료"와 ESC는 onClose를 부른다', async () => {
    const onClose = jest.fn();
    await renderSheet(<HelperSheet {...base} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('닫혀 있으면 아무것도 그리지 않는다', async () => {
    await renderSheet(<HelperSheet {...base} open={false} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('항목의 터치 영역은 44 이상이다', async () => {
    await renderSheet(<HelperSheet {...base} />);

    expect(screen.getByRole('button', { name: '열쇠' }).className).toContain(
      'min-h-11'
    );
  });
});

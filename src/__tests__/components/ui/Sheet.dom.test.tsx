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

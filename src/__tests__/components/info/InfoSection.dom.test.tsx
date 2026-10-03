import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { InfoItem } from '@/components/molecules/InfoItem';
import { CommentInput } from '@/components/organisms/comment/CommentInput';
import { CommentItem } from '@/components/organisms/comment/CommentItem';
import { InfoSection } from '@/components/organisms/InfoSection';

describe('InfoSection · InfoItem', () => {
  it('묶음 제목과 항목의 이름·값을 보여 준다', () => {
    render(
      <InfoSection title="기본 정보">
        <InfoItem label="이름">홍길동</InfoItem>
        <InfoItem label="성별">남성</InfoItem>
      </InfoSection>
    );

    expect(screen.getByRole('heading', { name: '기본 정보' })).toBeTruthy();
    expect(screen.getByText('이름')).toBeTruthy();
    expect(screen.getByText('홍길동')).toBeTruthy();
    expect(screen.getByText('남성')).toBeTruthy();
  });

  it('항목은 최소 높이 44이고, 긴 값은 줄바꿈한다', () => {
    render(
      <InfoSection title="기본 정보">
        <InfoItem label="메모">아주 긴 값</InfoItem>
      </InfoSection>
    );

    const value = screen.getByText('아주 긴 값');
    expect(value.className).toContain('break-words');
    expect(value.parentElement?.className).toContain('min-h-11');
  });

  it('fullWidth면 내용을 통째로 한 면에 담는다', () => {
    const { container } = render(
      <InfoSection title="신청 메시지" fullWidth>
        <p>메시지</p>
      </InfoSection>
    );

    expect(screen.getByText('메시지')).toBeTruthy();
    expect(container.querySelector('section > div')?.className).toContain(
      'p-4'
    );
  });
});

describe('CommentItem', () => {
  const base = {
    id: 'c1',
    content: '토요일에 봬요',
    author: { name: '김민수' },
    createdAt: '2026-10-02T03:00:00.000Z',
  };

  it('작성자와 내용을 보여 준다. 작성자가 없으면 "알 수 없음"', () => {
    const { rerender } = render(<CommentItem {...base} />);
    expect(screen.getByText('김민수')).toBeTruthy();
    expect(screen.getByText('토요일에 봬요')).toBeTruthy();

    rerender(<CommentItem {...base} author={null} />);
    expect(screen.getByText('알 수 없음')).toBeTruthy();
  });

  it('내 댓글이 아니면 수정·삭제 버튼이 없다', () => {
    render(<CommentItem {...base} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('수정을 누르면 입력칸이 열리고, 완료하면 고친 내용으로 알린다', () => {
    const onUpdate = jest.fn();
    render(<CommentItem {...base} isEditable onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '일요일에 봬요' },
    });
    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(onUpdate).toHaveBeenCalledWith('c1', '일요일에 봬요');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('수정 중 취소하면 원래 내용으로 돌아가고 알리지 않는다', () => {
    const onUpdate = jest.fn();
    render(<CommentItem {...base} isEditable onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '바꾼 내용' },
    });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText('토요일에 봬요')).toBeTruthy();
  });

  it('내용을 비우면 완료할 수 없다', () => {
    render(<CommentItem {...base} isEditable onUpdate={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  ' } });

    expect(
      (screen.getByRole('button', { name: '완료' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('삭제를 누르면 그 댓글의 id로 알린다', () => {
    const onDelete = jest.fn();
    render(<CommentItem {...base} isEditable onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });
});

describe('CommentInput', () => {
  it('내용을 쓰고 작성하면 알리고 칸을 비운다', () => {
    const onSubmit = jest.fn();
    render(<CommentInput onSubmit={onSubmit} />);

    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: '반가워요' } });
    expect(screen.getByText('4/1000자')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '댓글 작성' }));
    expect(onSubmit).toHaveBeenCalledWith('반가워요');
    expect(box.value).toBe('');
  });

  it('비어 있거나 보내는 중이면 작성할 수 없다', () => {
    const { rerender } = render(<CommentInput onSubmit={() => {}} />);
    const submit = () =>
      screen
        .getAllByRole('button')
        .find((el) => el.className.includes('bg-accent')) as HTMLButtonElement;
    expect(submit().disabled).toBe(true);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '글' } });
    expect(submit().disabled).toBe(false);

    rerender(<CommentInput onSubmit={() => {}} isSubmitting />);
    expect(submit().disabled).toBe(true);
  });
});

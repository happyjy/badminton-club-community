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

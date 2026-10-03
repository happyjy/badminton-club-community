import { describe, expect, it, jest } from '@jest/globals';
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

  it('화면이 준비되기 전에 이미 사진 불러오기가 실패해 있었으면 첫 글자로 바꾼다', () => {
    // 서버가 그린 <img>는 React가 붙기 전에 실패할 수 있고, 그때는 onError가
    // 불리지 않는다. 브라우저는 그런 그림을 complete=true, naturalWidth=0으로 둔다.
    const complete = jest
      .spyOn(HTMLImageElement.prototype, 'complete', 'get')
      .mockReturnValue(true);
    const naturalWidth = jest
      .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
      .mockReturnValue(0);

    render(<Avatar name="김민수" src="https://example.com/expired.jpg" />);

    const avatar = screen.getByRole('img', { name: '김민수' });
    expect(avatar.tagName).toBe('SPAN');
    expect(avatar.textContent).toBe('김');

    complete.mockRestore();
    naturalWidth.mockRestore();
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

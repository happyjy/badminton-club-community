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

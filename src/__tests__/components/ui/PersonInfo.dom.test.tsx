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

describe('PersonInfo의 글자', () => {
  // 나이대는 올해 기준이라 태어난 해를 올해에서 거꾸로 센다.
  const birthYear = (age: number) => `${new Date().getFullYear() - age}-05-01`;

  it('성별·나이대·급수를 한 줄로 이어 보여 준다', () => {
    render(
      <PersonInfo
        name="김민수"
        gender="MALE"
        birthDate={birthYear(34)}
        localTournamentLevel="C"
      />
    );

    expect(screen.getByText('남성 · 30대 · 지역 C')).toBeTruthy();
  });

  it('급수는 전국만 / 지역만 / 둘 다의 글자가 다르다', () => {
    const { rerender } = render(
      <PersonInfo name="김민수" nationalTournamentLevel="A" />
    );
    expect(screen.getByText('전국 A')).toBeTruthy();

    rerender(<PersonInfo name="김민수" localTournamentLevel="C" />);
    expect(screen.getByText('지역 C')).toBeTruthy();

    rerender(
      <PersonInfo
        name="김민수"
        nationalTournamentLevel="A"
        localTournamentLevel="C"
      />
    );
    expect(screen.getByText('전국A/지역C')).toBeTruthy();
  });

  it('모르는 성별 값은 받은 그대로 보여 준다', () => {
    render(<PersonInfo name="김민수" gender="여" />);

    expect(screen.getByText('여')).toBeTruthy();
  });

  it('정보가 하나도 없으면 설명 줄이 없다', () => {
    const { container } = render(<PersonInfo name="김민수" />);

    expect(container.querySelector('[data-person-meta]')).toBeNull();
  });

  it('번호가 있으면 이름 앞에 붙인다', () => {
    render(<PersonInfo name="김민수" number={3} />);

    expect(screen.getByText('3.')).toBeTruthy();
    expect(screen.getByText('김민수')).toBeTruthy();
  });

  it('가입 희망이면 칩으로 알린다', () => {
    const { rerender } = render(<PersonInfo name="홍길동" intendToJoin />);
    expect(screen.getByText('가입희망').className).toContain(
      'bg-positive-soft'
    );

    rerender(<PersonInfo name="홍길동" intendToJoin={false} />);
    expect(screen.queryByText('가입희망')).toBeNull();
  });

  it('게스트를 신청한 사람을 보여 준다', () => {
    render(<PersonInfo name="홍길동" guestRequestName="김민수" />);

    expect(screen.getByText('신청자: 김민수')).toBeTruthy();
  });

  it('덧붙인 아이콘을 그린다', () => {
    render(<PersonInfo name="김민수" extraIcons={<span>도움 아이콘</span>} />);

    expect(screen.getByText('도움 아이콘')).toBeTruthy();
  });

  it('긴 이름은 한 줄에서 자른다', () => {
    render(<PersonInfo name="아주아주아주 긴 이름을 가진 회원" />);

    expect(
      screen.getByText('아주아주아주 긴 이름을 가진 회원').closest('.truncate')
    ).toBeTruthy();
  });
});

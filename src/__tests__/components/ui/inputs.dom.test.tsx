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

    expect(
      screen.getByRole('combobox').querySelectorAll('option')
    ).toHaveLength(1);
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

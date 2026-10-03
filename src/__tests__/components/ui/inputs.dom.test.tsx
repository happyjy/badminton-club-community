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

    expect(
      screen.getByRole('combobox').querySelectorAll('option')
    ).toHaveLength(0);
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

  it('호출부가 작은 글자를 줘도 본문 크기를 지킨다', () => {
    render(<Textarea placeholder="내용" className="text-sm" />);

    const classes = screen.getByPlaceholderText('내용').className.split(' ');
    expect(classes).toContain('text-body');
    expect(classes).not.toContain('text-sm');
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

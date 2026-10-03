import { useState } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { Column, DataTable } from '@/components/organisms/table/DataTable';

interface Member {
  id: number;
  name: string;
  age: number | null;
}

const ROWS: Member[] = [
  { id: 1, name: '다람', age: 31 },
  { id: 2, name: '가온', age: 24 },
  { id: 3, name: '나래', age: null },
];

const COLUMNS: Column<Member>[] = [
  {
    key: 'name',
    header: '이름',
    cell: (row) => row.name,
    sortValue: (row) => row.name,
  },
  {
    key: 'age',
    header: '나이',
    cell: (row) => (row.age === null ? '-' : `${row.age}세`),
    sortValue: (row) => row.age,
    align: 'right',
  },
  { key: 'memo', header: '메모', cell: () => '없음' },
];

const base = {
  rows: ROWS,
  rowKey: (row: Member) => row.id,
  columns: COLUMNS,
  list: {
    title: (row: Member) => row.name,
    subtitle: (row: Member) =>
      row.age === null ? '나이 미입력' : `${row.age}세`,
  },
  empty: '회원이 없어요',
  'aria-label': '회원',
};

const table = () => screen.getByRole('table', { name: '회원' });
const bodyRows = () => within(table()).getAllByRole('row').slice(1);
const names = () =>
  bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent);
const list = () => screen.getByTestId('data-table-list');

describe('DataTable — 표 (PC)', () => {
  it('열 정의대로 머리글과 칸을 그린다', () => {
    render(<DataTable {...base} />);

    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((th) => th.textContent)
    ).toEqual(['이름', '나이', '메모']);
    expect(names()).toEqual(['다람', '가온', '나래']);
    expect(within(bodyRows()[0]).getByText('31세')).toBeTruthy();
  });

  it('정렬할 수 있는 열의 머리글만 버튼이다', () => {
    render(<DataTable {...base} />);

    expect(within(table()).getByRole('button', { name: '이름' })).toBeTruthy();
    expect(within(table()).queryByRole('button', { name: '메모' })).toBeNull();
  });

  it('머리글을 누르면 오름차순 → 내림차순 → 원래 순서로 돈다', () => {
    render(<DataTable {...base} />);
    const header = () =>
      within(table()).getByRole('columnheader', { name: '이름' });
    const button = within(table()).getByRole('button', { name: '이름' });

    expect(header().getAttribute('aria-sort')).toBe('none');

    fireEvent.click(button);
    expect(names()).toEqual(['가온', '나래', '다람']);
    expect(header().getAttribute('aria-sort')).toBe('ascending');

    fireEvent.click(button);
    expect(names()).toEqual(['다람', '나래', '가온']);
    expect(header().getAttribute('aria-sort')).toBe('descending');

    fireEvent.click(button);
    expect(names()).toEqual(['다람', '가온', '나래']);
    expect(header().getAttribute('aria-sort')).toBe('none');
  });

  it('숫자는 숫자로 견주고, 값이 없는 행은 어느 방향이든 맨 뒤에 둔다', () => {
    render(<DataTable {...base} />);
    const button = within(table()).getByRole('button', { name: '나이' });

    fireEvent.click(button);
    expect(names()).toEqual(['가온', '다람', '나래']);
    fireEvent.click(button);
    expect(names()).toEqual(['다람', '가온', '나래']);
  });

  it('행을 누르면 그 행을 알려 준다 (Enter로도)', () => {
    const onRowClick = jest.fn();
    render(<DataTable {...base} onRowClick={onRowClick} />);

    fireEvent.click(bodyRows()[1]);
    expect(onRowClick).toHaveBeenLastCalledWith(ROWS[1]);

    fireEvent.keyDown(bodyRows()[2], { key: 'Enter' });
    expect(onRowClick).toHaveBeenLastCalledWith(ROWS[2]);
    expect(bodyRows()[0].getAttribute('tabindex')).toBe('0');
  });

  it('행 안의 버튼을 누를 때는 행 동작이 일어나지 않는다', () => {
    const onRowClick = jest.fn();
    const onApprove = jest.fn();
    render(
      <DataTable
        {...base}
        onRowClick={onRowClick}
        columns={[
          ...COLUMNS,
          {
            key: 'action',
            header: '동작',
            cell: (row) => (
              <button type="button" onClick={() => onApprove(row.id)}>
                승인
              </button>
            ),
          },
        ]}
      />
    );

    const button = within(bodyRows()[0]).getByRole('button', { name: '승인' });
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(onApprove).toHaveBeenCalledWith(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('행이 없으면 빈 안내를 보여 주고 표는 그리지 않는다', () => {
    render(<DataTable {...base} rows={[]} />);

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('회원이 없어요')).toBeTruthy();
  });
});

describe('DataTable — 행 선택', () => {
  function Selectable({ rows = ROWS }: { rows?: Member[] }) {
    const [selected, setSelected] = useState<Set<string | number>>(new Set());
    return (
      <>
        <DataTable
          {...base}
          rows={rows}
          selection={{ selected, onChange: setSelected }}
        />
        <output data-testid="selected">{[...selected].sort().join(',')}</output>
      </>
    );
  }
  const selectedIds = () => screen.getByTestId('selected').textContent;

  it('selection이 없으면 체크박스가 없다', () => {
    render(<DataTable {...base} />);
    expect(within(table()).queryByRole('checkbox')).toBeNull();
  });

  it('행의 체크박스로 하나씩 고르고 뺀다', () => {
    render(<Selectable />);
    const box = within(table()).getByRole('checkbox', { name: '다람 선택' });

    fireEvent.click(box);
    expect(selectedIds()).toBe('1');
    fireEvent.click(box);
    expect(selectedIds()).toBe('');
  });

  it('체크박스를 눌러도 행 동작은 일어나지 않는다', () => {
    const onRowClick = jest.fn();
    render(
      <DataTable
        {...base}
        onRowClick={onRowClick}
        selection={{ selected: new Set(), onChange: () => {} }}
      />
    );

    fireEvent.click(
      within(table()).getByRole('checkbox', { name: '다람 선택' })
    );
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('머리글 체크박스는 전체를 고르고, 다 골라져 있으면 전체를 뺀다', () => {
    render(<Selectable />);
    const all = within(table()).getByRole('checkbox', {
      name: '전체 선택',
    }) as HTMLInputElement;

    fireEvent.click(all);
    expect(selectedIds()).toBe('1,2,3');
    expect(all.checked).toBe(true);

    fireEvent.click(all);
    expect(selectedIds()).toBe('');
  });

  it('일부만 고르면 머리글 체크박스가 중간 상태가 된다', () => {
    render(<Selectable />);
    const all = within(table()).getByRole('checkbox', {
      name: '전체 선택',
    }) as HTMLInputElement;

    fireEvent.click(
      within(table()).getByRole('checkbox', { name: '가온 선택' })
    );
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
  });
});

describe('DataTable — 리스트 (휴대폰)', () => {
  it('같은 행을 제목·부제로 그린다', () => {
    render(<DataTable {...base} />);

    expect(within(list()).getByText('다람')).toBeTruthy();
    expect(within(list()).getByText('31세')).toBeTruthy();
    expect(within(list()).getByText('나이 미입력')).toBeTruthy();
  });

  it('행을 누를 수 있으면 버튼이 되고, 누르면 그 행을 알려 준다', () => {
    const onRowClick = jest.fn();
    render(<DataTable {...base} onRowClick={onRowClick} />);

    fireEvent.click(within(list()).getByRole('button', { name: /가온/ }));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
  });

  it('표에서 정렬하면 리스트도 같은 순서다', () => {
    render(<DataTable {...base} onRowClick={() => {}} />);

    fireEvent.click(within(table()).getByRole('button', { name: '이름' }));
    expect(
      within(list())
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual(['가온24세', '나래나이 미입력', '다람31세']);
  });

  it('표는 lg 이상에서만, 리스트는 lg 미만에서만 보인다 (CSS로만 전환)', () => {
    render(<DataTable {...base} />);

    expect(list().className).toContain('lg:hidden');
    const wrapper = table().closest('[data-testid="data-table-table"]');
    expect(wrapper?.className).toContain('hidden');
    expect(wrapper?.className).toContain('lg:block');
  });
});

describe('DataTable — 쪽 넘김', () => {
  it('pagination을 주면 아래에 쪽 번호가 붙는다', () => {
    const onChange = jest.fn();
    render(
      <DataTable {...base} pagination={{ page: 1, totalPages: 3, onChange }} />
    );

    fireEvent.click(screen.getByRole('button', { name: '2쪽' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('행이 없어도 쪽 번호는 남는다 (빈 쪽에서 다른 쪽으로 갈 수 있게)', () => {
    const onChange = jest.fn();
    render(
      <DataTable
        {...base}
        rows={[]}
        pagination={{ page: 2, totalPages: 2, onChange }}
      />
    );

    expect(screen.getByText('회원이 없어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '1쪽' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});

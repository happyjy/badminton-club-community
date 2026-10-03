import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { BulkActionBar } from '@/components/organisms/table/BulkActionBar';
import { Toolbar } from '@/components/organisms/table/Toolbar';

describe('Toolbar', () => {
  it('검색칸에 글자를 넣으면 값을 알려 준다', () => {
    const onChange = jest.fn();
    render(
      <Toolbar search={{ value: '', onChange, placeholder: '이름 검색' }} />
    );

    const input = screen.getByRole('searchbox', { name: '이름 검색' });
    fireEvent.change(input, { target: { value: '가온' } });
    expect(onChange).toHaveBeenCalledWith('가온');
  });

  it('search가 없으면 검색칸이 없다', () => {
    render(<Toolbar>필터</Toolbar>);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getByText('필터')).toBeTruthy();
  });

  it('요약과 오른쪽 동작을 그린다', () => {
    render(
      <Toolbar summary="총 3명" actions={<button type="button">추가</button>} />
    );
    expect(screen.getByText('총 3명')).toBeTruthy();
    expect(screen.getByRole('button', { name: '추가' })).toBeTruthy();
  });
});

describe('BulkActionBar', () => {
  it('고른 것이 없으면 그리지 않는다', () => {
    const { container } = render(
      <BulkActionBar count={0} onClear={() => {}}>
        <button type="button">승인</button>
      </BulkActionBar>
    );
    expect(container.firstChild).toBeNull();
  });

  it('고른 수와 동작 버튼을 보여 준다', () => {
    render(
      <BulkActionBar count={3} onClear={() => {}}>
        <button type="button">승인</button>
      </BulkActionBar>
    );
    expect(screen.getByRole('region', { name: '선택한 항목' })).toBeTruthy();
    expect(screen.getByText('3명 선택됨')).toBeTruthy();
    expect(screen.getByRole('button', { name: '승인' })).toBeTruthy();
  });

  it('단위를 바꿀 수 있다', () => {
    render(
      <BulkActionBar count={2} unit="건" onClear={() => {}}>
        x
      </BulkActionBar>
    );
    expect(screen.getByText('2건 선택됨')).toBeTruthy();
  });

  it('선택 해제를 누르면 onClear가 불린다', () => {
    const onClear = jest.fn();
    render(
      <BulkActionBar count={1} onClear={onClear}>
        x
      </BulkActionBar>
    );
    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { BulkKindSheet } from '@/components/organisms/membership-fee/BulkKindSheet';

const sheet = () => within(screen.getByRole('dialog'));

describe('BulkKindSheet — 선택 항목 분류 변경', () => {
  it('고른 건수와 바꿀 수 있는 분류 다섯 가지를 보인다', () => {
    render(
      <BulkKindSheet open count={3} onClose={() => {}} onPick={() => {}} />
    );

    expect(sheet().getByText('선택 3건')).toBeTruthy();
    expect(
      sheet()
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter((text) =>
          ['회비', '가입비', '행사', '기타', '이자'].includes(text ?? '')
        )
    ).toEqual(['행사', '기타', '가입비', '이자', '회비']);
  });

  it('분류를 누르면 그 분류를 알린다', async () => {
    const onPick = jest.fn();
    render(<BulkKindSheet open count={3} onClose={() => {}} onPick={onPick} />);

    await act(async () => {
      fireEvent.click(sheet().getByRole('button', { name: '행사' }));
    });

    expect(onPick).toHaveBeenCalledWith('EVENT');
  });

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(
      <BulkKindSheet
        open={false}
        count={3}
        onClose={() => {}}
        onPick={() => {}}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

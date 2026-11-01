import { ComponentProps } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import { BulkConfirmSheet } from '@/components/organisms/membership-fee/BulkConfirmSheet';
import { PaymentRecordsView } from '@/components/organisms/membership-fee/PaymentRecordsView';

import type { UseBulkPaymentActionsResult } from '@/hooks/membership-fee/useBulkPaymentActions';

import type { PaymentRecord } from '@/types/membership-fee.types';

const record = (id: string, overrides: Partial<PaymentRecord> = {}) =>
  ({
    id,
    batchId: 'b1',
    clubId: 1,
    transactionDate: new Date('2025-05-01T00:00:00Z'),
    depositorName: `입금자${id}`,
    amount: 30000,
    memo: null,
    matchedMemberId: null,
    status: 'PENDING',
    errorReason: null,
    kind: 'FEE',
    kindReason: null,
    nonFeeAmount: 0,
    nonFeeKind: null,
    monthHints: null,
    needsReview: false,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as PaymentRecord;

const matched = (id: string, overrides: Partial<PaymentRecord> = {}) =>
  record(id, {
    status: 'MATCHED',
    matchedMembers: [
      {
        id: `m${id}`,
        clubMemberId: 10,
        clubMember: { id: 10, name: '가온' },
      },
    ],
    ...overrides,
  });

type Props = ComponentProps<typeof PaymentRecordsView>;
const base: Props = {
  records: [],
  members: [
    { id: 10, name: '가온' },
    { id: 20, name: '나래' },
  ],
  year: 2025,
  onUpdateMember: () => {},
  onUpdateRecord: () => {},
  onAdvanceStartMonth: () => {},
  onConfirm: () => {},
  onUnconfirm: () => {},
  onSkip: () => {},
  onUnskip: () => {},
};

const table = () => within(screen.getByTestId('data-table-table'));

const openRow = async (name: string) => {
  await act(async () => {
    fireEvent.click(table().getByText(name));
  });
  return within(screen.getByRole('dialog'));
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element);
  });
};

const isDisabled = (element: HTMLElement) =>
  (element as HTMLButtonElement).disabled;

describe('PaymentRecordsView — 표', () => {
  it('행이 없으면 빈 문구를 보인다', () => {
    render(<PaymentRecordsView {...base} />);
    expect(screen.getByText('입금 내역이 없습니다.')).toBeTruthy();
  });

  it('selection이 없으면 체크박스가 없다', () => {
    render(<PaymentRecordsView {...base} records={[matched('1')]} />);
    expect(table().queryByRole('checkbox')).toBeNull();
  });

  it('selection이 있으면 고른 id를 문자열 배열로 알린다', async () => {
    const onChange = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        records={[matched('1'), matched('2')]}
        selection={{ selected: [], onChange }}
      />
    );
    await click(table().getByRole('checkbox', { name: '입금자1 선택' }));
    expect(onChange).toHaveBeenCalledWith(['1']);
  });

  it('체크박스를 눌러도 상세 시트는 열리지 않는다', async () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[matched('1')]}
        selection={{ selected: [], onChange: () => {} }}
      />
    );
    await click(table().getByRole('checkbox', { name: '입금자1 선택' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('매칭 회원과 최종 납부월, 에러 사유를 표에 보인다', () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', { lastPaidYearMonth: { year: 2025, month: 4 } }),
          matched('2'),
          record('3', { status: 'ERROR', errorReason: '금액 불일치' }),
        ]}
      />
    );
    expect(table().getAllByText('가온')).toHaveLength(2);
    expect(table().getByText('최종 납부: 2025년 4월')).toBeTruthy();
    expect(table().getByText('최종 납부: 없음')).toBeTruthy();
    expect(table().getByText('미매칭')).toBeTruthy();
    expect(table().getByText('금액 불일치')).toBeTruthy();
  });

  it('확정된 건은 확정 월을, 건너뛴 건은 건너뜀을 표에 보인다', () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', {
            status: 'CONFIRMED',
            payments: [
              { id: 'p1', year: 2025, month: 6 },
              { id: 'p2', year: 2025, month: 5 },
              { id: 'p3', year: 2026, month: 1 },
            ],
          }),
          record('2', { status: 'SKIPPED' }),
        ]}
      />
    );
    expect(
      table().getByText('확정됨 (2025년 5월, 6월 / 2026년 1월)')
    ).toBeTruthy();
    // 상태 칩과 작업 칸 두 곳
    expect(table().getAllByText('건너뜀')).toHaveLength(2);
  });
});

describe('PaymentRecordsView — 표의 분류·검토 표시', () => {
  it('회비가 아닌 건은 분류와 그렇게 본 근거를 보인다', () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          record('1', {
            status: 'SKIPPED',
            kind: 'EVENT',
            kindReason: "'단체티' 표기",
          }),
        ]}
      />
    );

    expect(table().getByText('행사')).toBeTruthy();
    expect(table().getByText("'단체티' 표기")).toBeTruthy();
  });

  it('회비 건에는 분류 칩을 붙이지 않는다', () => {
    render(<PaymentRecordsView {...base} records={[matched('1')]} />);

    expect(table().queryByText('회비')).toBeNull();
  });

  it('검토가 필요한 건은 표시와 사유를 보인다', () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', {
            needsReview: true,
            reviewReasons: ['입금 부족 (20,000원 < 25,000원)', '초과 입금 1원'],
          }),
        ]}
      />
    );

    expect(table().getByText('검토 필요')).toBeTruthy();
    expect(
      table().getByText('입금 부족 (20,000원 < 25,000원) · 초과 입금 1원')
    ).toBeTruthy();
  });

  it('회비가 아닌 금액을 뗀 건은 회비와 뗀 금액을 나눠 보인다', () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', {
            amount: 125000,
            nonFeeAmount: 100000,
            nonFeeKind: 'JOINING_FEE',
          }),
        ]}
      />
    );

    expect(table().getByText('125,000원')).toBeTruthy();
    expect(table().getByText('회비 25,000원 + 가입비 100,000원')).toBeTruthy();
  });
});

describe('PaymentRecordsView — 휴대폰 리스트', () => {
  const list = () => within(screen.getByTestId('data-table-list'));

  it('에러 사유와 확정된 월을 리스트에서도 보인다', () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          record('1', { status: 'ERROR', errorReason: '금액 불일치' }),
          matched('2', {
            status: 'CONFIRMED',
            payments: [{ id: 'p1', year: 2025, month: 5 }],
          }),
        ]}
      />
    );
    expect(list().getByText(/금액 불일치/)).toBeTruthy();
    expect(list().getByText(/확정됨 \(2025년 5월\)/)).toBeTruthy();
  });
});

describe('PaymentRecordsView — 상세 시트', () => {
  it('대기 건(매칭 회원 없음)에는 확정이 없고 건너뛰기만 있다', async () => {
    const onSkip = jest.fn();
    render(
      <PaymentRecordsView {...base} onSkip={onSkip} records={[record('1')]} />
    );
    const sheet = await openRow('입금자1');
    expect(sheet.queryByRole('button', { name: '확정' })).toBeNull();
    await click(sheet.getByRole('button', { name: '건너뛰기' }));
    expect(onSkip).toHaveBeenCalledWith('1');
  });

  it('차기 의무월이 기본으로 골라져 있고, 확정하면 그 값으로 불린다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', {
            lastPaidYearMonth: { year: 2025, month: 4 },
            nextSuggestedYearMonth: { year: 2025, month: 6 },
            nextSuggestedReasons: ['2025년 5월 휴회'],
          }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(sheet.getByText('2025년 6월')).toBeTruthy();
    expect(sheet.getByText('차기월(권장): 2025년 6월')).toBeTruthy();
    expect(sheet.getByText('└ 2025년 5월 휴회')).toBeTruthy();
    await click(sheet.getByRole('button', { name: '확정' }));
    expect(onConfirm).toHaveBeenCalledWith('1', [{ year: 2025, months: [6] }]);
  });

  it('차기 의무월이 없으면 최종 납부월의 다음 달을 고른다 (12월 → 다음 해 1월)', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', { lastPaidYearMonth: { year: 2025, month: 12 } }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    await click(sheet.getByRole('button', { name: '확정' }));
    expect(onConfirm).toHaveBeenCalledWith('1', [{ year: 2026, months: [1] }]);
  });

  it('차기 의무월이 명시적으로 null이면 권장 없음을 알린다', async () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', {
            lastPaidYearMonth: { year: 2025, month: 4 },
            nextSuggestedYearMonth: null,
          }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(sheet.getByText('차기월(권장): 없음')).toBeTruthy();
  });

  it('납부 이력도 추천도 없으면 suggestedMonths를 회계 연도로 고른다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[matched('1', { suggestedMonths: [3, 4] })]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(
      sheet.getByText('최종 납부월: 없음 (첫 납부 또는 이전 확정 이력 없음)')
    ).toBeTruthy();
    await click(sheet.getByRole('button', { name: '확정' }));
    expect(onConfirm).toHaveBeenCalledWith('1', [
      { year: 2025, months: [3, 4] },
    ]);
  });

  it('고른 것이 없으면 확정할 수 없다', async () => {
    render(<PaymentRecordsView {...base} records={[matched('1')]} />);
    const sheet = await openRow('입금자1');
    expect(isDisabled(sheet.getByRole('button', { name: '확정' }))).toBe(true);
  });

  it('고른 월을 추가하지 않은 채로는 확정할 수 없다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', { nextSuggestedYearMonth: { year: 2025, month: 6 } }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    await click(sheet.getByRole('button', { name: '7월' }));
    expect(isDisabled(sheet.getByRole('button', { name: '확정' }))).toBe(true);
    expect(
      sheet.getByText(
        '선택한 2025년 7월을 위 [＋] 버튼으로 추가한 뒤 확정해주세요.'
      )
    ).toBeTruthy();

    await click(sheet.getByRole('button', { name: '선택한 연도·월 추가' }));
    expect(isDisabled(sheet.getByRole('button', { name: '확정' }))).toBe(false);
    await click(sheet.getByRole('button', { name: '확정' }));
    // 같은 연도는 월을 합쳐 정렬한다.
    expect(onConfirm).toHaveBeenCalledWith('1', [
      { year: 2025, months: [6, 7] },
    ]);
  });

  it('다른 연도를 추가하면 선택이 둘이 되고, 제거할 수 있다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', { nextSuggestedYearMonth: { year: 2025, month: 12 } }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    fireEvent.change(sheet.getByRole('combobox', { name: '연도' }), {
      target: { value: '2026' },
    });
    await click(sheet.getByRole('button', { name: '1월' }));
    await click(sheet.getByRole('button', { name: '선택한 연도·월 추가' }));
    await click(sheet.getByRole('button', { name: '2025년 12월 제거' }));
    await click(sheet.getByRole('button', { name: '확정' }));
    expect(onConfirm).toHaveBeenCalledWith('1', [{ year: 2026, months: [1] }]);
  });

  it('처리 중에는 확정·건너뛰기를 누를 수 없다', async () => {
    render(
      <PaymentRecordsView
        {...base}
        isUpdating
        records={[
          matched('1', { nextSuggestedYearMonth: { year: 2025, month: 6 } }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(isDisabled(sheet.getByRole('button', { name: '확정' }))).toBe(true);
    expect(isDisabled(sheet.getByRole('button', { name: '건너뛰기' }))).toBe(
      true
    );
  });

  it('확정된 건은 확정 월을 보이고 확정 취소만 할 수 있다', async () => {
    const onUnconfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUnconfirm={onUnconfirm}
        records={[
          matched('1', {
            status: 'CONFIRMED',
            payments: [{ id: 'p1', year: 2025, month: 5 }],
          }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(sheet.getByText('확정됨 (2025년 5월)')).toBeTruthy();
    expect(sheet.queryByRole('button', { name: '회원 수정' })).toBeNull();
    expect(sheet.queryByRole('button', { name: '건너뛰기' })).toBeNull();
    expect(sheet.queryByRole('button', { name: '확정' })).toBeNull();
    await click(sheet.getByRole('button', { name: '확정 취소 후 수정' }));
    expect(onUnconfirm).toHaveBeenCalledWith('1');
  });

  it('건너뛴 건은 해제만 할 수 있다', async () => {
    const onUnskip = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUnskip={onUnskip}
        records={[record('1', { status: 'SKIPPED' })]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(sheet.queryByRole('button', { name: '건너뛰기' })).toBeNull();
    expect(sheet.queryByRole('button', { name: '회원 수정' })).toBeNull();
    await click(sheet.getByRole('button', { name: '건너뛰기 해제 후 수정' }));
    expect(onUnskip).toHaveBeenCalledWith('1');
  });

  it('회원 수정을 누르면 회원을 고를 수 있고, 고르는 즉시 알린다', async () => {
    const onUpdateMember = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUpdateMember={onUpdateMember}
        records={[matched('1')]}
      />
    );
    const sheet = await openRow('입금자1');
    await click(sheet.getByRole('button', { name: '회원 수정' }));
    await click(sheet.getByRole('button', { name: '가온' }));
    await click(sheet.getByRole('option', { name: '나래' }));
    expect(onUpdateMember).toHaveBeenCalledWith('1', [10, 20]);
  });

  it('시트를 연 채 records가 바뀌면 새 값을 보인다', async () => {
    const { rerender } = render(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', { lastPaidYearMonth: { year: 2025, month: 4 } }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    expect(sheet.getByText(/최종 납부월:/).textContent).toContain('2025년 4월');
    rerender(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', { lastPaidYearMonth: { year: 2025, month: 9 } }),
        ]}
      />
    );
    expect(
      within(screen.getByRole('dialog')).getByText(/최종 납부월:/).textContent
    ).toContain('2025년 9월');
  });

  it('다른 건을 열면 고르던 월을 버리고 그 건의 기본값으로 시작한다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', { nextSuggestedYearMonth: { year: 2025, month: 6 } }),
          matched('2', { nextSuggestedYearMonth: { year: 2025, month: 9 } }),
        ]}
      />
    );
    let sheet = await openRow('입금자1');
    await click(sheet.getByRole('button', { name: '7월' }));
    await click(sheet.getByRole('button', { name: '닫기' }));

    sheet = await openRow('입금자2');
    await click(sheet.getByRole('button', { name: '확정' }));
    expect(onConfirm).toHaveBeenCalledWith('2', [{ year: 2025, months: [9] }]);
  });
});

describe('PaymentRecordsView — 시트를 연 채 데이터가 바뀔 때', () => {
  it('매칭 회원이 없던 건에 회원을 붙이면 그 회원의 차기월이 기본으로 골라진다', async () => {
    const onConfirm = jest.fn();
    const { rerender } = render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[record('1')]}
      />
    );
    await openRow('입금자1');
    rerender(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', { nextSuggestedYearMonth: { year: 2025, month: 8 } }),
        ]}
      />
    );
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByText('2025년 8월')).toBeTruthy();
    await click(sheet.getByRole('button', { name: '확정' }));
    expect(onConfirm).toHaveBeenCalledWith('1', [{ year: 2025, months: [8] }]);
  });

  it('매칭 회원을 바꾸면 고르던 월을 버리고 새 회원의 차기월로 다시 잡는다', async () => {
    const onConfirm = jest.fn();
    const { rerender } = render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', { nextSuggestedYearMonth: { year: 2025, month: 6 } }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    await click(sheet.getByRole('button', { name: '7월' }));
    await click(sheet.getByRole('button', { name: '선택한 연도·월 추가' }));

    rerender(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', {
            matchedMembers: [
              {
                id: 'm1-20',
                clubMemberId: 20,
                clubMember: { id: 20, name: '나래' },
              },
            ],
            nextSuggestedYearMonth: { year: 2025, month: 11 },
          }),
        ]}
      />
    );
    await click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '확정' })
    );
    expect(onConfirm).toHaveBeenCalledWith('1', [{ year: 2025, months: [11] }]);
  });

  it('같은 회원인 채 데이터만 새로 오면 고르던 월을 지킨다', async () => {
    const onConfirm = jest.fn();
    const { rerender } = render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', { nextSuggestedYearMonth: { year: 2025, month: 6 } }),
        ]}
      />
    );
    const sheet = await openRow('입금자1');
    await click(sheet.getByRole('button', { name: '7월' }));
    await click(sheet.getByRole('button', { name: '선택한 연도·월 추가' }));

    // 다른 건이 갱신되어 목록이 새로 왔다. 이 건의 내용은 같다.
    rerender(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', { nextSuggestedYearMonth: { year: 2025, month: 6 } }),
          matched('2'),
        ]}
      />
    );
    await click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '확정' })
    );
    expect(onConfirm).toHaveBeenCalledWith('1', [
      { year: 2025, months: [6, 7] },
    ]);
  });

  it('열어 둔 건이 목록에서 빠졌다가 다시 나타나도 시트가 저절로 열리지 않는다', async () => {
    const { rerender } = render(
      <PaymentRecordsView {...base} records={[record('1'), record('2')]} />
    );
    await openRow('입금자1');

    // 상태가 바뀌어 이 탭의 목록에서 빠졌다.
    rerender(<PaymentRecordsView {...base} records={[record('2')]} />);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // 다른 탭으로 가서 다시 목록에 나타났다.
    rerender(
      <PaymentRecordsView {...base} records={[matched('1'), record('2')]} />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('회원을 고르는 동안에는 목록이 펼쳐질 높이를 시트 안에 둔다', async () => {
    render(<PaymentRecordsView {...base} records={[record('1')]} />);
    const sheet = await openRow('입금자1');
    const section = sheet.getByRole('region', { name: '매칭 회원' });
    expect(section.className).not.toContain('min-h-80');
    await click(sheet.getByRole('button', { name: '회원 수정' }));
    expect(section.className).toContain('min-h-80');
  });
});

describe('BulkConfirmSheet', () => {
  const bulk = (overrides: Partial<UseBulkPaymentActionsResult> = {}) =>
    ({
      bulkSelectionYear: 2025,
      setBulkSelectionYear: jest.fn(),
      bulkSelectionMonths: [5],
      setBulkSelectionMonths: jest.fn(),
      handleBulkConfirmSelected: jest
        .fn<() => Promise<boolean>>()
        .mockResolvedValue(true),
      isBulkConfirmPending: false,
      ...overrides,
    }) as unknown as UseBulkPaymentActionsResult;

  const submit = () =>
    within(screen.getByRole('dialog')).getByRole('button', {
      name: '선택 항목 확정',
    });

  it('결과를 받으면 닫는다', async () => {
    const onClose = jest.fn();
    render(
      <BulkConfirmSheet
        open
        onClose={onClose}
        count={2}
        year={2025}
        bulk={bulk()}
      />
    );
    await click(submit());
    expect(onClose).toHaveBeenCalled();
  });

  it('거절·오류면 닫지 않는다', async () => {
    const onClose = jest.fn();
    const handle = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
    render(
      <BulkConfirmSheet
        open
        onClose={onClose}
        count={2}
        year={2025}
        bulk={bulk({ handleBulkConfirmSelected: handle })}
      />
    );
    await click(submit());
    expect(handle).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('월을 고르지 않으면 확정할 수 없다', () => {
    render(
      <BulkConfirmSheet
        open
        onClose={() => {}}
        count={2}
        year={2025}
        bulk={bulk({ bulkSelectionMonths: [] })}
      />
    );
    expect(isDisabled(submit())).toBe(true);
  });

  it('연도는 회계 연도의 앞뒤 한 해까지 고를 수 있다', () => {
    const setBulkSelectionYear = jest.fn();
    render(
      <BulkConfirmSheet
        open
        onClose={() => {}}
        count={2}
        year={2025}
        bulk={bulk({ setBulkSelectionYear })}
      />
    );
    const select = screen.getByRole('combobox', { name: '연도' });
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['2024년', '2025년', '2026년']);
    fireEvent.change(select, { target: { value: '2026' } });
    expect(setBulkSelectionYear).toHaveBeenCalledWith(2026);
  });
});

describe('PaymentRecordsView — 상세 시트의 배정과 빠른 선택', () => {
  it('배정된 달이 있으면 그 달이 기본으로 골라져 있다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', {
            suggestedSelections: [
              { year: 2025, month: 12 },
              { year: 2026, month: 1 },
            ],
          }),
        ]}
      />
    );
    const dialog = await openRow('입금자1');

    await click(dialog.getByRole('button', { name: '확정' }));

    expect(onConfirm).toHaveBeenCalledWith('1', [
      { year: 2025, months: [12] },
      { year: 2026, months: [1] },
    ]);
  });

  it('입금자가 적은 달이 배정과 다르면 한 번에 그 달로 바꿀 수 있다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', {
            suggestedSelections: [{ year: 2025, month: 5 }],
            monthHints: {
              source: 'depositorName',
              months: [
                { year: 2025, month: 6 },
                { year: 2025, month: 7 },
              ],
            },
            needsReview: true,
            reviewReasons: [
              '월 힌트(2025년 6월, 2025년 7월)가 입금 개월 수 1개월과 다름',
            ],
          }),
        ]}
      />
    );
    const dialog = await openRow('입금자1');

    await click(
      dialog.getByRole('button', { name: '입금자명에 적힌 달: 2025년 6, 7월' })
    );
    await click(dialog.getByRole('button', { name: '확정' }));

    expect(onConfirm).toHaveBeenCalledWith('1', [
      { year: 2025, months: [6, 7] },
    ]);
  });

  it('입금자가 적은 달이 배정과 같으면 바꾸는 버튼을 두지 않는다', async () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', {
            suggestedSelections: [{ year: 2025, month: 5 }],
            monthHints: {
              source: 'depositorName',
              months: [{ year: 2025, month: 5 }],
            },
          }),
        ]}
      />
    );
    const dialog = await openRow('입금자1');

    expect(dialog.queryByRole('button', { name: /적힌 달/ })).toBeNull();
  });

  it('앞서 덜 낸 달이 있으면 그 달을 채우도록 고를 수 있다', async () => {
    const onConfirm = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onConfirm={onConfirm}
        records={[
          matched('1', {
            amount: 5000,
            suggestedSelections: [{ year: 2025, month: 6 }],
            partialPaidMonth: { year: 2025, month: 5 },
          }),
        ]}
      />
    );
    const dialog = await openRow('입금자1');

    await click(
      dialog.getByRole('button', { name: '2025년 5월 부족분 채우기' })
    );
    await click(dialog.getByRole('button', { name: '확정' }));

    expect(onConfirm).toHaveBeenCalledWith('1', [{ year: 2025, months: [5] }]);
  });

  it('적힌 달이 의무 시작 전이면 시작월을 앞당기도록 알릴 수 있다', async () => {
    const onAdvanceStartMonth = jest.fn();
    const target = matched('1', {
      suggestedStartMonth: { year: 2025, month: 3 },
    });
    render(
      <PaymentRecordsView
        {...base}
        onAdvanceStartMonth={onAdvanceStartMonth}
        records={[target]}
      />
    );
    const dialog = await openRow('입금자1');

    await click(
      dialog.getByRole('button', {
        name: '의무 시작월을 2025년 3월로 앞당기기',
      })
    );

    expect(onAdvanceStartMonth).toHaveBeenCalledWith(target, {
      year: 2025,
      month: 3,
    });
  });

  it('검토 사유를 시트에서 보여 준다', async () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[
          matched('1', {
            needsReview: true,
            reviewReasons: ['초과 입금 5,000원'],
          }),
        ]}
      />
    );
    const dialog = await openRow('입금자1');

    expect(dialog.getByText('초과 입금 5,000원')).toBeTruthy();
  });

  it('자동 매칭이 불확실한 건은 회원이 맞다고 확인할 수 있다', async () => {
    const onUpdateMember = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUpdateMember={onUpdateMember}
        records={[
          matched('1', {
            needsReview: true,
            reviewReasons: [
              '이름이 비슷한 회원으로 자동 매칭됨 — 회원을 확인해주세요',
            ],
          }),
        ]}
      />
    );
    const dialog = await openRow('입금자1');

    await click(dialog.getByRole('button', { name: '이 회원이 맞음' }));

    expect(onUpdateMember).toHaveBeenCalledWith('1', [10]);
  });
});

describe('PaymentRecordsView — 상세 시트의 분류·금액 나누기·메모', () => {
  const change = (element: HTMLElement, value: string) =>
    act(async () => {
      fireEvent.change(element, { target: { value } });
    });

  it('분류를 바꾸면 바로 알린다', async () => {
    const onUpdateRecord = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUpdateRecord={onUpdateRecord}
        records={[matched('1')]}
      />
    );
    const dialog = await openRow('입금자1');

    await change(dialog.getByLabelText('분류'), 'EVENT');

    expect(onUpdateRecord).toHaveBeenCalledWith('1', { kind: 'EVENT' });
  });

  it('회비가 아닌 금액과 성격을 적어 적용한다', async () => {
    const onUpdateRecord = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUpdateRecord={onUpdateRecord}
        records={[matched('1', { amount: 49500 })]}
      />
    );
    const dialog = await openRow('입금자1');
    const apply = dialog.getByRole('button', { name: '적용' });

    await change(dialog.getByLabelText('회비가 아닌 금액'), '24500');
    // 성격을 고르기 전에는 적용할 수 없다
    expect(isDisabled(apply)).toBe(true);
    await change(dialog.getByLabelText('회비가 아닌 금액의 성격'), 'OTHER');
    await click(apply);

    expect(onUpdateRecord).toHaveBeenCalledWith('1', {
      nonFeeAmount: 24500,
      nonFeeKind: 'OTHER',
    });
  });

  it('금액을 0으로 적용하면 뗀 금액을 되돌린다', async () => {
    const onUpdateRecord = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUpdateRecord={onUpdateRecord}
        records={[
          matched('1', {
            amount: 125000,
            nonFeeAmount: 100000,
            nonFeeKind: 'JOINING_FEE',
          }),
        ]}
      />
    );
    const dialog = await openRow('입금자1');

    await change(dialog.getByLabelText('회비가 아닌 금액'), '');
    await click(dialog.getByRole('button', { name: '적용' }));

    expect(onUpdateRecord).toHaveBeenCalledWith('1', {
      nonFeeAmount: 0,
      nonFeeKind: null,
    });
  });

  it('메모는 입력칸을 벗어날 때 저장하고, 바뀌지 않았으면 저장하지 않는다', async () => {
    const onUpdateRecord = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUpdateRecord={onUpdateRecord}
        records={[matched('1', { note: '확인 중' })]}
      />
    );
    const dialog = await openRow('입금자1');
    const note = dialog.getByLabelText('메모') as HTMLInputElement;

    expect(note.value).toBe('확인 중');
    await act(async () => {
      fireEvent.blur(note);
    });
    expect(onUpdateRecord).not.toHaveBeenCalled();

    await change(note, '4월 병가, 5월로 이월');
    await act(async () => {
      fireEvent.blur(note);
    });
    expect(onUpdateRecord).toHaveBeenCalledWith('1', {
      note: '4월 병가, 5월로 이월',
    });
  });

  it('건너뛴 행사 건은 분류를 바꿀 수 있고, 건너뛰기 해제는 두지 않는다', async () => {
    const onUpdateRecord = jest.fn();
    render(
      <PaymentRecordsView
        {...base}
        onUpdateRecord={onUpdateRecord}
        records={[
          record('1', {
            status: 'SKIPPED',
            kind: 'EVENT',
            kindReason: "'단체티' 표기",
          }),
        ]}
      />
    );
    const dialog = await openRow('입금자1');

    expect(dialog.queryByRole('button', { name: /건너뛰기 해제/ })).toBeNull();
    expect(dialog.queryByLabelText('회비가 아닌 금액')).toBeNull();
    // 회원을 매칭할 일이 없으니 "미매칭"을 할 일처럼 보이지 않게 한다
    expect(dialog.queryByText('미매칭')).toBeNull();
    await change(dialog.getByLabelText('분류'), 'FEE');

    expect(onUpdateRecord).toHaveBeenCalledWith('1', { kind: 'FEE' });
  });

  it('확정된 건은 분류와 금액을 고칠 수 없고 메모만 고칠 수 있다', async () => {
    render(
      <PaymentRecordsView
        {...base}
        records={[matched('1', { status: 'CONFIRMED' })]}
      />
    );
    const dialog = await openRow('입금자1');

    expect((dialog.getByLabelText('분류') as HTMLSelectElement).disabled).toBe(
      true
    );
    expect(dialog.queryByLabelText('회비가 아닌 금액')).toBeNull();
    expect((dialog.getByLabelText('메모') as HTMLInputElement).disabled).toBe(
      false
    );
  });
});

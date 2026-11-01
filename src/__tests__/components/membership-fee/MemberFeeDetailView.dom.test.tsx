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

import { MemberFeeDetailView } from '@/components/organisms/membership-fee/MemberFeeDetailView';

type Props = ComponentProps<typeof MemberFeeDetailView>;

const base: Props = {
  member: {
    id: 10,
    name: '가온',
    status: 'APPROVED',
    createdAt: '2025-01-02T00:00:00.000Z',
    feeObligationStartAt: null,
    leftAt: null,
  },
  leaves: [
    {
      id: 5,
      clubMemberId: 10,
      startYear: 2026,
      startMonth: 3,
      endYear: 2026,
      endMonth: 5,
      reason: '부상',
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 6,
      clubMemberId: 10,
      startYear: 2026,
      startMonth: 9,
      endYear: null,
      endMonth: null,
      reason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  saving: false,
  feeStartInput: '2025-02',
  onChangeFeeStart: () => {},
  onSaveFeeStart: () => {},
  leftAtInput: '',
  onChangeLeftAt: () => {},
  feeEndInput: '',
  onChangeFeeEnd: () => {},
  onSaveLeftInfo: () => {},
  onSubmitLeave: async () => true,
  onDeleteLeave: () => {},
  positionInput: '',
  onChangePosition: () => {},
  positionOrderInput: '',
  onChangePositionOrder: () => {},
  onSavePosition: () => {},
  orphanPayments: [],
  onShiftPayments: () => {},
};

const LEFT_MEMBER = {
  ...base.member,
  status: 'LEFT',
  leftAt: '2026-06-15T00:00:00.000Z',
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element);
  });
};

const sheet = () => within(screen.getByRole('dialog'));

describe('MemberFeeDetailView — 회비 설정', () => {
  it('가입일을 보인다', () => {
    render(<MemberFeeDetailView {...base} />);
    expect(screen.getByText('가입일 (클럽)')).toBeTruthy();
    expect(screen.getByText('2025년 1월 2일')).toBeTruthy();
  });

  it('입금 시작월을 바꾸면 알리고, 저장을 누르면 입금 시작 저장을 부른다', async () => {
    const onChangeFeeStart = jest.fn();
    const onSaveFeeStart = jest.fn();
    const onSaveLeftInfo = jest.fn();
    render(
      <MemberFeeDetailView
        {...base}
        onChangeFeeStart={onChangeFeeStart}
        onSaveFeeStart={onSaveFeeStart}
        onSaveLeftInfo={onSaveLeftInfo}
      />
    );
    fireEvent.change(screen.getByLabelText('시작월'), {
      target: { value: '2025-04' },
    });
    expect(onChangeFeeStart).toHaveBeenCalledWith('2025-04');
    await click(screen.getByRole('button', { name: '저장' }));
    expect(onSaveFeeStart).toHaveBeenCalled();
    expect(onSaveLeftInfo).not.toHaveBeenCalled();
  });

  it('활동 회원에게는 탈퇴일·마지막 월 입력이 없다', () => {
    render(<MemberFeeDetailView {...base} />);
    expect(screen.queryByLabelText('탈퇴일')).toBeNull();
    expect(screen.queryByLabelText('마지막 월')).toBeNull();
    expect(screen.queryByText('탈퇴')).toBeNull();
  });

  it('탈퇴 회원은 탈퇴일·마지막 월을 고칠 수 있고, 저장은 탈퇴 정보 저장을 부른다', async () => {
    const onChangeLeftAt = jest.fn();
    const onChangeFeeEnd = jest.fn();
    const onSaveFeeStart = jest.fn();
    const onSaveLeftInfo = jest.fn();
    render(
      <MemberFeeDetailView
        {...base}
        member={LEFT_MEMBER}
        leftAtInput="2026-06-15"
        feeEndInput="2026-06"
        onChangeLeftAt={onChangeLeftAt}
        onChangeFeeEnd={onChangeFeeEnd}
        onSaveFeeStart={onSaveFeeStart}
        onSaveLeftInfo={onSaveLeftInfo}
      />
    );
    expect(screen.getByText('탈퇴')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('탈퇴일'), {
      target: { value: '2026-07-01' },
    });
    expect(onChangeLeftAt).toHaveBeenCalledWith('2026-07-01');
    fireEvent.change(screen.getByLabelText('마지막 월'), {
      target: { value: '2026-07' },
    });
    expect(onChangeFeeEnd).toHaveBeenCalledWith('2026-07');
    await click(screen.getByRole('button', { name: '저장' }));
    expect(onSaveLeftInfo).toHaveBeenCalled();
    expect(onSaveFeeStart).not.toHaveBeenCalled();
  });

  it('저장 중에는 저장을 누를 수 없다', () => {
    render(<MemberFeeDetailView {...base} saving />);
    // 회비 설정 저장과 직책 저장, 둘 다 잠긴다
    const saveButtons = screen.getAllByRole('button', {
      name: /저장/,
    }) as HTMLButtonElement[];
    expect(saveButtons).toHaveLength(2);
    expect(saveButtons.every((button) => button.disabled)).toBe(true);
  });
});

describe('MemberFeeDetailView — 휴회/병가 기간', () => {
  it('회차·기간·사유를 보이고, 종료가 없으면 미정이라고 한다', () => {
    render(<MemberFeeDetailView {...base} />);
    expect(screen.getByText('1회차: 2026.03 ~ 2026.05 (부상)')).toBeTruthy();
    expect(screen.getByText('2회차: 2026.09 ~ 미정')).toBeTruthy();
  });

  it('휴회 추가를 누르면 빈 시트가 열리고, 저장하면 editingId 없이 알린다', async () => {
    const onSubmitLeave = jest
      .fn<Props['onSubmitLeave']>()
      .mockResolvedValue(true);
    render(<MemberFeeDetailView {...base} onSubmitLeave={onSubmitLeave} />);
    await click(screen.getByRole('button', { name: '휴회 추가' }));
    fireEvent.change(sheet().getByLabelText(/시작 연월/), {
      target: { value: '2027-01' },
    });
    fireEvent.change(sheet().getByLabelText(/사유/), {
      target: { value: '출산' },
    });
    expect(sheet().queryByRole('button', { name: '삭제' })).toBeNull();
    await click(sheet().getByRole('button', { name: '저장' }));
    expect(onSubmitLeave).toHaveBeenCalledWith({
      editingId: null,
      start: '2027-01',
      end: '',
      reason: '출산',
    });
  });

  it('휴회 기간을 누르면 그 값이 채워진 시트가 열리고, 저장하면 editingId와 함께 알린 뒤 닫힌다', async () => {
    const onSubmitLeave = jest
      .fn<Props['onSubmitLeave']>()
      .mockResolvedValue(true);
    render(<MemberFeeDetailView {...base} onSubmitLeave={onSubmitLeave} />);
    await click(screen.getByText('1회차: 2026.03 ~ 2026.05 (부상)'));
    expect(
      (sheet().getByLabelText(/시작 연월/) as HTMLInputElement).value
    ).toBe('2026-03');
    expect(
      (sheet().getByLabelText(/종료 연월/) as HTMLInputElement).value
    ).toBe('2026-05');
    expect((sheet().getByLabelText(/사유/) as HTMLInputElement).value).toBe(
      '부상'
    );
    await click(sheet().getByRole('button', { name: '저장' }));
    expect(onSubmitLeave).toHaveBeenCalledWith({
      editingId: 5,
      start: '2026-03',
      end: '2026-05',
      reason: '부상',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('저장이 실패하면 시트를 닫지 않고 적은 값을 지킨다', async () => {
    const onSubmitLeave = jest
      .fn<Props['onSubmitLeave']>()
      .mockResolvedValue(false);
    render(<MemberFeeDetailView {...base} onSubmitLeave={onSubmitLeave} />);
    await click(screen.getByRole('button', { name: '휴회 추가' }));
    fireEvent.change(sheet().getByLabelText(/사유/), {
      target: { value: '병가' },
    });
    await click(sheet().getByRole('button', { name: '저장' }));
    expect(onSubmitLeave).toHaveBeenCalled();
    expect((sheet().getByLabelText(/사유/) as HTMLInputElement).value).toBe(
      '병가'
    );
  });

  it('시트에서 삭제를 누르면 그 휴회의 id로 알린다', async () => {
    const onDeleteLeave = jest.fn();
    render(<MemberFeeDetailView {...base} onDeleteLeave={onDeleteLeave} />);
    await click(screen.getByText('2회차: 2026.09 ~ 미정'));
    await click(sheet().getByRole('button', { name: '삭제' }));
    expect(onDeleteLeave).toHaveBeenCalledWith(6);
  });

  it('추가 시트를 다시 열면 지난번에 적던 값이 남아 있지 않다', async () => {
    render(<MemberFeeDetailView {...base} />);
    await click(screen.getByText('1회차: 2026.03 ~ 2026.05 (부상)'));
    await click(sheet().getByRole('button', { name: '취소' }));
    await click(screen.getByRole('button', { name: '휴회 추가' }));
    expect(
      (sheet().getByLabelText(/시작 연월/) as HTMLInputElement).value
    ).toBe('');
    expect((sheet().getByLabelText(/사유/) as HTMLInputElement).value).toBe('');
  });
});

describe('MemberFeeDetailView — 의무가 없는 달의 납부', () => {
  const ORPHANS = [
    { id: 'p4', year: 2026, month: 4, amount: 25000 },
    { id: 'p5', year: 2026, month: 5, amount: 22500 },
  ];

  it('휴회·탈퇴로 의무가 없어진 달에 낸 회비가 있으면 어느 달 얼마인지 알린다', () => {
    render(<MemberFeeDetailView {...base} orphanPayments={ORPHANS} />);

    const notice = within(screen.getByRole('note'));
    expect(
      notice.getByText(/의무가 없는 달에 낸 회비 2건이 있습니다/)
    ).toBeTruthy();
    expect(notice.getByText(/2026년 4월 25,000원/)).toBeTruthy();
    expect(notice.getByText(/2026년 5월 22,500원/)).toBeTruthy();
  });

  it('이월을 누르면 이월을 알린다', async () => {
    const onShiftPayments = jest.fn();
    render(
      <MemberFeeDetailView
        {...base}
        orphanPayments={ORPHANS}
        onShiftPayments={onShiftPayments}
      />
    );

    await click(screen.getByRole('button', { name: '다음 의무월로 이월' }));

    expect(onShiftPayments).toHaveBeenCalledTimes(1);
  });

  it('저장 중에는 이월을 누를 수 없다', () => {
    render(<MemberFeeDetailView {...base} orphanPayments={ORPHANS} saving />);

    expect(
      screen.getByRole('button', { name: '다음 의무월로 이월' })
    ).toHaveProperty('disabled', true);
  });

  it('그런 납부가 없으면 안내를 보이지 않는다', () => {
    render(<MemberFeeDetailView {...base} />);

    expect(screen.queryByRole('note')).toBeNull();
    expect(
      screen.queryByRole('button', { name: '다음 의무월로 이월' })
    ).toBeNull();
  });
});

describe('MemberFeeDetailView — 직책', () => {
  it('직책과 정렬 순서를 보여 준다', () => {
    render(
      <MemberFeeDetailView
        {...base}
        positionInput="총무"
        positionOrderInput="3"
      />
    );

    expect((screen.getByLabelText('직책') as HTMLInputElement).value).toBe(
      '총무'
    );
    expect((screen.getByLabelText('정렬 순서') as HTMLInputElement).value).toBe(
      '3'
    );
  });

  it('입력을 바꾸면 바뀐 값을 알린다', () => {
    const onChangePosition = jest.fn();
    const onChangePositionOrder = jest.fn();
    render(
      <MemberFeeDetailView
        {...base}
        onChangePosition={onChangePosition}
        onChangePositionOrder={onChangePositionOrder}
      />
    );

    fireEvent.change(screen.getByLabelText('직책'), {
      target: { value: '재무' },
    });
    fireEvent.change(screen.getByLabelText('정렬 순서'), {
      target: { value: '2' },
    });

    expect(onChangePosition).toHaveBeenCalledWith('재무');
    expect(onChangePositionOrder).toHaveBeenCalledWith('2');
  });

  it('직책 저장 버튼을 누르면 저장을 알린다', async () => {
    const onSavePosition = jest.fn();
    render(<MemberFeeDetailView {...base} onSavePosition={onSavePosition} />);

    await click(screen.getByRole('button', { name: '직책 저장' }));

    expect(onSavePosition).toHaveBeenCalledTimes(1);
  });

  it('무엇에 쓰이는지 알려 준다', () => {
    render(<MemberFeeDetailView {...base} />);

    // 없으면 getByText가 던진다
    screen.getByText(
      '납부현황 내보내기의 비고에 적히고, 직책이 있는 회원이 표의 위쪽에 정렬 순서대로 나옵니다.'
    );
  });
});

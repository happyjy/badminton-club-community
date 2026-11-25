import { describe, expect, it } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';

import { UploadResultSummary } from '@/components/organisms/membership-fee/UploadResultSummary';

import type { PaymentRecord } from '@/types/membership-fee.types';

const record = (over: Partial<PaymentRecord>) =>
  ({
    kind: 'FEE',
    status: 'MATCHED',
    needsReview: false,
    ...over,
  }) as PaymentRecord;

/** "회비 3"처럼 이름 옆의 숫자를 읽는다 */
const countOf = (group: string, label: string) => {
  const term = within(screen.getByRole('group', { name: group })).getByText(
    label
  );
  return term.parentElement?.querySelector('dd')?.textContent;
};

describe('UploadResultSummary', () => {
  const records = [
    record({}),
    record({ needsReview: true }),
    record({ status: 'CONFIRMED' }),
    record({ status: 'PENDING' }),
    record({ status: 'ERROR', needsReview: true }),
    record({ kind: 'EVENT', status: 'SKIPPED' }),
    record({ kind: 'EVENT', status: 'SKIPPED' }),
    record({ kind: 'JOINING_FEE', status: 'SKIPPED' }),
    record({ kind: 'INTEREST', status: 'SKIPPED' }),
  ];

  it('올린 입금을 분류별로 센다', () => {
    render(<UploadResultSummary records={records} />);

    expect(countOf('분류', '전체')).toBe('9');
    expect(countOf('분류', '회비')).toBe('5');
    expect(countOf('분류', '가입비')).toBe('1');
    expect(countOf('분류', '행사')).toBe('2');
    expect(countOf('분류', '기타')).toBe('0');
    expect(countOf('분류', '이자')).toBe('1');
  });

  it('회비가 어디까지 처리됐는지 센다', () => {
    render(<UploadResultSummary records={records} />);

    expect(countOf('회비 처리', '확정')).toBe('1');
    expect(countOf('회비 처리', '매칭됨')).toBe('2');
    expect(countOf('회비 처리', '대기')).toBe('1');
    expect(countOf('회비 처리', '에러')).toBe('1');
    expect(countOf('회비 처리', '검토 필요')).toBe('2');
  });

  it('건너뛴 회비는 처리 현황의 어느 칸에도 세지 않는다', () => {
    render(<UploadResultSummary records={[record({ status: 'SKIPPED' })]} />);

    expect(countOf('분류', '회비')).toBe('1');
    expect(countOf('회비 처리', '매칭됨')).toBe('0');
  });
});

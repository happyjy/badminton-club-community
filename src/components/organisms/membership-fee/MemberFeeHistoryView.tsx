import { StatusChip } from '@/components/atoms/StatusChip';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { OptionPicker } from '@/components/molecules/OptionPicker';

import type {
  FeeHistoryLeave,
  FeeHistoryMonth,
  FeeHistoryPayment,
  MemberFeeHistory,
} from '@/types/membership-fee.types';

import {
  formatAsOf,
  formatDepositDate,
  formatMonthlyFee,
  formatUnpaidSummary,
  MONTH_STATUS_LABEL,
  visibleMonths,
} from './memberFeeHistoryDisplay';

interface MemberFeeHistoryViewProps {
  history: MemberFeeHistory;
  onChangeYear: (year: number) => void;
  /** 휴회 묶음을 그릴지. 회원 상세는 자기 휴회 섹션이 있어 그리지 않는다 */
  showLeaves: boolean;
}

const won = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;
const ym = (year: number, month: number) =>
  `${year}.${String(month).padStart(2, '0')}`;

/** 한 납부의 한 줄: "25,000원 · 5월 1일 입금 · 입금자 OOO · 부부" */
function paymentLine(
  year: number,
  month: FeeHistoryMonth,
  payment: FeeHistoryPayment
) {
  const parts = [won(payment.amount)];
  if (payment.transactionDate) {
    parts.push(`${formatDepositDate(payment.transactionDate, year)} 입금`);
  } else {
    parts.push('직접 추가');
    if (payment.manualReason) parts.push(payment.manualReason);
  }
  if (payment.depositorName) parts.push(`입금자 ${payment.depositorName}`);
  if (month.isCouple) parts.push('부부');
  if (month.status === 'LEAVE' || month.status === 'NONE') {
    parts.push('의무 없는 달에 낸 회비');
  }
  if (month.status === 'EXEMPT') parts.push('면제 달에 낸 회비');
  return parts.join(' · ');
}

function leaveLabel(leave: FeeHistoryLeave) {
  const end =
    leave.endYear != null && leave.endMonth != null
      ? ym(leave.endYear, leave.endMonth)
      : '미정';
  const range = `${ym(leave.startYear, leave.startMonth)} ~ ${end}`;
  return leave.reason ? `${range} · ${leave.reason}` : range;
}

/**
 * 회원 한 명의 한 해 납부 이력. 내 회비(회원)와 회원 상세(임원)가 같이 쓴다.
 * 칸 상태는 대시보드와 같은 계산(memberYearStatus)에서 온다.
 */
export function MemberFeeHistoryView({
  history,
  onChangeYear,
  showLeaves,
}: MemberFeeHistoryViewProps) {
  if (history.member.feeExcluded) {
    return (
      <EmptyState
        title="회비 대상이 아니에요"
        className="rounded-md bg-surface"
      />
    );
  }

  const monthlyFee = formatMonthlyFee(history.summary.monthlyFee);
  const months = visibleMonths(history.months);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 px-4">
        <p className="text-footnote text-secondary">
          {formatAsOf(history.asOf)}
        </p>
        <OptionPicker
          aria-label="연도"
          align="right"
          options={history.years.map((year) => ({
            value: String(year),
            label: `${year}년`,
          }))}
          value={String(history.year)}
          onChange={(value) => onChangeYear(Number(value))}
        />
      </div>

      <ListGroup>
        <ListRow title={formatUnpaidSummary(history.year, history.summary)} />
        {monthlyFee && <ListRow title="월 회비" subtitle={monthlyFee} />}
      </ListGroup>

      {history.pendingDeposits.length > 0 && (
        <ListGroup label="확인 중인 입금">
          {history.pendingDeposits.map((deposit) => (
            <ListRow
              key={`${deposit.transactionDate}-${deposit.amount}`}
              title={`${formatDepositDate(deposit.transactionDate, history.year)} 입금 · ${won(deposit.amount)}`}
              trailing={
                <span className="text-footnote text-secondary">
                  재무님 확인 중
                </span>
              }
            />
          ))}
        </ListGroup>
      )}

      <ListGroup label={`${history.year}년 납부 이력`}>
        {months.length === 0 && (
          <ListRow title="이 해에는 회비를 낼 달이 없어요" />
        )}
        {months.map((month) => {
          const lines = [
            ...(month.status === 'LEAVE' && month.leaveReason
              ? [month.leaveReason]
              : []),
            ...month.payments.map((payment) =>
              paymentLine(history.year, month, payment)
            ),
          ];
          return (
            <ListRow
              key={month.month}
              title={`${month.month}월`}
              subtitle={
                lines.length > 0
                  ? lines.map((line, index) => (
                      <span key={index} className="block">
                        {line}
                      </span>
                    ))
                  : undefined
              }
              trailing={
                <StatusChip domain="feeMonth" status={month.status}>
                  {MONTH_STATUS_LABEL[month.status]}
                </StatusChip>
              }
            />
          );
        })}
      </ListGroup>

      {showLeaves && history.leaves.length > 0 && (
        <ListGroup label="휴회">
          {history.leaves.map((leave) => (
            <ListRow
              key={`${leave.startYear}-${leave.startMonth}`}
              title={leaveLabel(leave)}
            />
          ))}
        </ListGroup>
      )}
    </div>
  );
}

export default MemberFeeHistoryView;

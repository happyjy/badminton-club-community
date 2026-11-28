import type {
  FeeHistorySummary,
  MonthlyFeeRange,
} from '@/lib/membership-fee/memberFeeHistory';
import type { CellStatus } from '@/lib/membership-fee/memberYearStatus';
import type { FeeHistoryMonth } from '@/types/membership-fee.types';

/** 납부 이력 화면의 글자. 날짜는 늘 한국 시각으로 적는다 (서버는 UTC) */

export const MONTH_STATUS_LABEL: Record<CellStatus, string> = {
  PAID: '낸 달',
  UNPAID: '미납',
  LEAVE: '휴회',
  EXEMPT: '면제',
  NONE: '해당 없음',
  FUTURE: '아직',
};

const won = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

const KST = 'Asia/Seoul';

/** 한국 시각의 연·월·일·시·분 */
function kstParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** "통장 거래 11월 20일 오후 2:30까지 반영". 올해가 아니면 연도를 붙인다 */
export function formatAsOf(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '아직 올라온 통장 내역이 없어요';
  const at = kstParts(new Date(iso));
  const yearPrefix = at.year === kstParts(now).year ? '' : `${at.year}년 `;
  const meridiem = at.hour < 12 ? '오전' : '오후';
  const hour12 = at.hour % 12 === 0 ? 12 : at.hour % 12;
  const minute = String(at.minute).padStart(2, '0');
  return `통장 거래 ${yearPrefix}${at.month}월 ${at.day}일 ${meridiem} ${hour12}:${minute}까지 반영`;
}

/** "5월 1일" */
export function formatDepositDate(iso: string): string {
  const at = kstParts(new Date(iso));
  return `${at.month}월 ${at.day}일`;
}

/** "2026년 미납 2달 · 50,000원" / 단가가 없으면 달 수만 / "2026년 미납 없음" */
export function formatUnpaidSummary(
  year: number,
  summary: FeeHistorySummary
): string {
  if (summary.unpaidCount === 0) return `${year}년 미납 없음`;
  const head = `${year}년 미납 ${summary.unpaidCount}달`;
  return summary.unpaidAmount == null
    ? head
    : `${head} · ${won(summary.unpaidAmount)}`;
}

/** "월 25,000원" / "1~4월 25,000원 · 5월부터 22,500원 (부부)". 구간이 없으면 null */
export function formatMonthlyFee(ranges: MonthlyFeeRange[]): string | null {
  if (ranges.length === 0) return null;
  const couple = (range: MonthlyFeeRange) => (range.isCouple ? ' (부부)' : '');
  if (ranges.length === 1) {
    return `월 ${won(ranges[0].amount)}${couple(ranges[0])}`;
  }
  return ranges
    .map((range, index) => {
      const months =
        index === ranges.length - 1
          ? `${range.fromMonth}월부터`
          : range.fromMonth === range.toMonth
            ? `${range.fromMonth}월`
            : `${range.fromMonth}~${range.toMonth}월`;
      return `${months} ${won(range.amount)}${couple(range)}`;
    })
    .join(' · ');
}

/** 가입 전·탈퇴 후(해당 없음)와 아직 오지 않은 달은 납부가 걸려 있을 때만 보인다 */
export function visibleMonths(months: FeeHistoryMonth[]): FeeHistoryMonth[] {
  return months.filter(
    (month) =>
      (month.status !== 'NONE' && month.status !== 'FUTURE') ||
      month.payments.length > 0
  );
}

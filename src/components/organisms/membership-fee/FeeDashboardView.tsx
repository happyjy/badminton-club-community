import Link from 'next/link';

import {
  Clock,
  Download,
  FileText,
  LucideIcon,
  Settings,
  Users,
  UserX,
} from 'lucide-react';

import { Button } from '@/components/atoms/buttons/Button';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';
import { Notice } from '@/components/molecules/Notice';
import { OptionPicker } from '@/components/molecules/OptionPicker';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import DashboardSummaryCard from '@/components/organisms/membership-fee/DashboardSummaryCard';
import LatestUploadCard from '@/components/organisms/membership-fee/LatestUploadCard';
import PaymentDashboardTable, {
  memberFullyPaidThroughMonth,
  memberHasAnyUnpaidMonthThroughMonth,
} from '@/components/organisms/membership-fee/PaymentDashboardTable';
import { Toolbar } from '@/components/organisms/table/Toolbar';

import {
  MembershipFeeSettings,
  PaymentDashboardData,
} from '@/types/membership-fee.types';

export type DashboardMemberFilter = 'all' | 'unpaid' | 'paid';

interface FeeDashboardViewProps {
  clubId: string;
  year: number;
  onYearChange: (year: number) => void;
  /** 아직 받지 못했으면 바로가기만 그린다 */
  dashboard:
    | (PaymentDashboardData & { feeSettings: MembershipFeeSettings | null })
    | undefined;
  memberFilter: DashboardMemberFilter;
  onMemberFilterChange: (filter: DashboardMemberFilter) => void;
  /** 미납·납부 완료를 판정할 때 1월부터 몇 월까지 볼지 */
  throughMonth: number;
  onThroughMonthChange: (month: number) => void;
  /** 보고 있는 해의 납부현황표를 엑셀로 내려받는다 */
  onExport: () => void;
  isExporting: boolean;
}

const SHORTCUTS: Array<{ path: string; label: string; icon: LucideIcon }> = [
  { path: 'settings/fee-types', label: '회비 유형 관리', icon: Settings },
  { path: 'settings/couples', label: '부부 관리', icon: Users },
  { path: 'settings/exemptions', label: '면제 관리', icon: UserX },
  { path: 'process', label: '입금 내역 처리', icon: FileText },
  { path: 'report', label: '리포트', icon: FileText },
  { path: 'batches', label: '업로드 이력', icon: Clock },
];

const VIEW_OPTIONS: Array<{ value: DashboardMemberFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'unpaid', label: '미납 있음' },
  { value: 'paid', label: '납부 완료' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월까지`,
}));

/** 회비 관리 첫 화면의 본문. 데이터는 페이지가 읽어 넘긴다. */
export function FeeDashboardView({
  clubId,
  year,
  onYearChange,
  dashboard,
  memberFilter,
  onMemberFilterChange,
  throughMonth,
  onThroughMonthChange,
  onExport,
  isExporting,
}: FeeDashboardViewProps) {
  const base = `/clubs/${clubId}/membership-fee`;

  const tableMembers = !dashboard
    ? []
    : memberFilter === 'unpaid'
      ? dashboard.members.filter((m) =>
          memberHasAnyUnpaidMonthThroughMonth(m, throughMonth)
        )
      : memberFilter === 'paid'
        ? dashboard.members.filter((m) =>
            memberFullyPaidThroughMonth(m, throughMonth)
          )
        : dashboard.members;

  const emptyText =
    tableMembers.length > 0
      ? null
      : memberFilter === 'unpaid'
        ? `${year}년 1~${throughMonth}월 사이 미납이 있는 일반·부부 회원이 없습니다.`
        : memberFilter === 'paid'
          ? `${year}년 1~${throughMonth}월까지 모두 납부한 일반·부부 회원이 없습니다.`
          : null;

  return (
    <div className="space-y-3">
      {dashboard?.latestUpload && (
        <LatestUploadCard
          latestUpload={dashboard.latestUpload}
          clubId={clubId}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {[SHORTCUTS.slice(0, 3), SHORTCUTS.slice(3)].map((group, index) => (
          <ListGroup key={index}>
            {group.map(({ path, label, icon: Icon }) => (
              <ListRow
                key={path}
                title={label}
                href={`${base}/${path}`}
                leading={
                  <Icon aria-hidden className="h-5 w-5 text-secondary" />
                }
              />
            ))}
          </ListGroup>
        ))}
      </div>

      {/* 데이터를 받지 못했을 때도 보인다. 설정이 있는지 알 수 없으면 확인하라고 안내하는 편이 낫다. */}
      {!dashboard?.feeSettings && (
        <Notice tone="warning" className="mb-0">
          {year}년 회비 설정이 필요합니다.{' '}
          <Link
            href={`${base}/settings/fee-types`}
            className="font-semibold underline underline-offset-2"
          >
            회비 유형 관리
          </Link>
          에서 일반/부부 등 유형과 금액을 등록해주세요.
        </Notice>
      )}

      {dashboard && (
        <>
          <Toolbar
            className="mb-0"
            summary={
              dashboard.feeSettings &&
              `일반: ${dashboard.feeSettings.regularAmount.toLocaleString()}원 / 부부: ${dashboard.feeSettings.coupleAmount.toLocaleString()}원`
            }
            actions={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onExport}
                pending={isExporting}
                pendingText="내보내는 중…"
                pendingPosition="left"
              >
                <Download aria-hidden className="mr-1 h-4 w-4" />
                납부현황 내보내기
              </Button>
            }
          >
            <YearSelector year={year} onYearChange={onYearChange} />
          </Toolbar>

          <DashboardSummaryCard summary={dashboard.summary} year={year} />

          <section className="rounded-md bg-surface p-4">
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-headline text-primary">회원별 납부 현황</h2>
                <SegmentedControl<DashboardMemberFilter>
                  aria-label="목록 보기 방식"
                  options={VIEW_OPTIONS}
                  value={memberFilter}
                  onChange={onMemberFilterChange}
                />
              </div>
              {memberFilter === 'all' ? (
                <p className="text-caption text-secondary">
                  미납·납부 완료 탭에서는 1월부터 선택한 달까지를 기준으로
                  일반·부부 회원만 추립니다.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-footnote text-secondary">
                  <span className="shrink-0">
                    {memberFilter === 'paid'
                      ? '1월 ~ 선택한 달까지 모두 납부한 회원만'
                      : '1월 ~ 선택한 달 사이 미납이 있는 회원만'}
                  </span>
                  <OptionPicker
                    aria-label={
                      memberFilter === 'paid'
                        ? '납부 완료 기준 마지막 달'
                        : '미납 판정 기준 마지막 달'
                    }
                    options={MONTH_OPTIONS}
                    value={String(throughMonth)}
                    onChange={(value) => onThroughMonthChange(Number(value))}
                  />
                </div>
              )}
            </div>

            {emptyText ? (
              <p className="py-8 text-center text-callout text-secondary">
                {emptyText}
              </p>
            ) : (
              <PaymentDashboardTable
                members={tableMembers}
                year={year}
                clubId={clubId}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default FeeDashboardView;

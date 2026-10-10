import { useState } from 'react';

import { useRouter } from 'next/router';

import { Skeleton } from '@/components/atoms/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';
import { OptionPicker } from '@/components/molecules/OptionPicker';
import { PageHeader } from '@/components/organisms/PageHeader';
import { DataTable } from '@/components/organisms/table/DataTable';
import { Toolbar } from '@/components/organisms/table/Toolbar';

import {
  usePaymentDashboard,
  useUnpaidMembers,
} from '@/hooks/membership-fee/usePaymentDashboard';

import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

/** 부부 회원 이름 뒤에 붙는 글자 */
const coupleNote = (partnerName?: string | null) =>
  `(부부${partnerName ? ` · ${partnerName}` : ''})`;

function ReportPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const { data: dashboard, isLoading: isLoadingDashboard } =
    usePaymentDashboard(clubIdStr, year);
  const { data: unpaidData, isLoading: isLoadingUnpaid } = useUnpaidMembers(
    clubIdStr,
    year,
    selectedMonth
  );

  const isLoading = isLoadingDashboard || isLoadingUnpaid;
  const backHref = `/clubs/${clubId}/membership-fee`;

  if (isLoading) {
    return (
      <>
        <PageHeader title="회비 리포트" backHref={backHref} />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  const monthlyStats = dashboard?.summary.monthlyStats || [];
  const membersWithPayment =
    dashboard?.members.filter((m) => m.type !== 'exempt') || [];

  const yearTotal = dashboard?.summary.yearTotal || 0;
  const summary = [
    { label: '총 수입', value: `${yearTotal.toLocaleString()}원` },
    {
      label: '납부 대상',
      value: `${
        (dashboard?.summary.totalMembers || 0) -
        (dashboard?.summary.exemptMembers || 0)
      }명`,
    },
    { label: '부부 그룹', value: `${dashboard?.summary.coupleGroups || 0}팀` },
    { label: '면제 회원', value: `${dashboard?.summary.exemptMembers || 0}명` },
  ];

  // month 0은 합계 줄이다. 정렬에 섞이지 않도록 이 표의 열에는 sortValue를 주지 않는다.
  const monthlyRows = [
    ...monthlyStats,
    { month: 0, paidCount: 0, totalCount: 0, amount: yearTotal },
  ];

  return (
    <>
      <PageHeader title="회비 리포트" backHref={backHref} />

      <Toolbar>
        <YearSelector year={year} onYearChange={setYear} />
      </Toolbar>

      <section aria-label={`${year}년 연간 요약`}>
        <h2 className="mb-2 px-1 text-headline text-primary">
          {year}년 연간 요약
        </h2>
        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {summary.map(({ label, value }) => (
            <div key={label} className="rounded-md bg-surface p-4">
              <dt className="text-footnote text-secondary">{label}</dt>
              <dd className="text-title text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <h2 className="mb-2 mt-6 px-1 text-headline text-primary">
        월별 납부 현황
      </h2>
      <DataTable
        aria-label="월별 납부 현황"
        rows={monthlyRows}
        rowKey={(row) => row.month}
        columns={[
          {
            key: 'month',
            header: '월',
            cell: (row) =>
              row.month === 0 ? (
                <span className="font-semibold">합계</span>
              ) : (
                `${row.month}월`
              ),
          },
          {
            key: 'paid',
            header: '납부',
            cell: (row) =>
              row.month === 0 ? (
                '-'
              ) : (
                <span className="text-positive">{row.paidCount}명</span>
              ),
          },
          {
            key: 'unpaid',
            header: '미납',
            cell: (row) =>
              row.month === 0 ? (
                '-'
              ) : (
                <span className="text-negative">
                  {row.totalCount - row.paidCount}명
                </span>
              ),
          },
          {
            key: 'amount',
            header: '수입',
            align: 'right',
            cell: (row) => (
              <span className={row.month === 0 ? 'font-semibold' : undefined}>
                {row.amount.toLocaleString()}원
              </span>
            ),
          },
        ]}
        list={{
          title: (row) => (row.month === 0 ? '합계' : `${row.month}월`),
          subtitle: (row) =>
            row.month === 0
              ? undefined
              : `납부 ${row.paidCount}명 · 미납 ${row.totalCount - row.paidCount}명`,
          trailing: (row) => `${row.amount.toLocaleString()}원`,
        }}
        empty="월별 납부 현황이 없습니다."
      />

      {/* 회원별 12개월 중 납부 횟수 (n/12) */}
      <h2 className="mb-2 mt-6 px-1 text-headline text-primary">
        회원별 연간 납부 (12개월 중)
      </h2>
      <DataTable
        aria-label="회원별 연간 납부"
        rows={membersWithPayment}
        rowKey={(member) => member.id}
        columns={[
          {
            key: 'name',
            header: '회원',
            cell: (member) => (
              <>
                <span className="font-semibold">{member.name}</span>
                {member.type === 'couple' && (
                  <span className="ml-1 text-caption text-secondary">
                    {coupleNote(member.couplePartnerName)}
                  </span>
                )}
              </>
            ),
            sortValue: (member) => member.name,
          },
          {
            key: 'paid',
            header: '납부',
            cell: (member) => `${member.paidCount}/${member.totalMonths}`,
            sortValue: (member) => member.paidCount,
          },
        ]}
        list={{
          title: (member) => member.name,
          subtitle: (member) =>
            member.type === 'couple'
              ? coupleNote(member.couplePartnerName)
              : undefined,
          trailing: (member) => `${member.paidCount}/${member.totalMonths}`,
        }}
        empty="회원 데이터가 없습니다."
      />

      {/* 미납 회원 목록. OptionPicker의 PC 메뉴가 잘리지 않게 묶음 밖에 둔다. */}
      <div className="mb-2 mt-6 flex items-center justify-between gap-2 px-1">
        <h2 className="text-headline text-primary">미납 회원 목록</h2>
        <OptionPicker
          aria-label="미납 회원 기준 달"
          align="right"
          options={MONTH_OPTIONS}
          value={String(selectedMonth)}
          onChange={(value) => setSelectedMonth(Number(value))}
        />
      </div>
      {unpaidData && unpaidData.unpaidMembers.length > 0 ? (
        <ListGroup
          label={`${year}년 ${selectedMonth}월 미납: ${unpaidData.totalUnpaid}명`}
        >
          {unpaidData.unpaidMembers.map((member) => (
            <ListRow
              key={member.id}
              title={member.name || '(이름 없음)'}
              subtitle={
                member.type === 'couple'
                  ? coupleNote(member.partnerName)
                  : undefined
              }
            />
          ))}
        </ListGroup>
      ) : (
        <EmptyState
          title={`${selectedMonth}월 미납 회원이 없습니다.`}
          className="rounded-md bg-surface"
        />
      )}
    </>
  );
}

export default withAuth(ReportPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});

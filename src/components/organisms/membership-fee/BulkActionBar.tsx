import { Dispatch, SetStateAction } from 'react';

import MonthSelector from '@/components/molecules/membership-fee/MonthSelector';

import { UseBulkPaymentActionsResult } from '@/hooks/membership-fee/useBulkPaymentActions';

interface BulkActionBarProps {
  /** 현재 활성 상태 탭. statusFilter별로 다른 액션 분기 (CONFIRMED/MATCHED/PENDING/ERROR/SKIPPED) */
  statusFilter: string | undefined;
  /** 다중 선택된 record id */
  selectedRecordIds: string[];
  setSelectedRecordIds: Dispatch<SetStateAction<string[]>>;
  /** YearSelector에서 사용 중인 회계 연도. MATCHED 탭의 연도 셀렉트 옵션 기준값 */
  year: number;
  /** useBulkPaymentActions 훅 반환값 — 핸들러/selection 상태/pending 플래그 묶음 */
  bulk: UseBulkPaymentActionsResult;
}

/**
 * 선택 항목 일괄 동작 바.
 *
 * statusFilter별로 표시되는 액션이 다르다:
 * - PENDING / ERROR : 선택 항목 건너뛰기
 * - MATCHED         : 선택 항목 확정 (연·월 지정) / 선택 항목 건너뛰기
 * - CONFIRMED       : 선택 항목 확정 취소
 * - SKIPPED         : 선택 항목 건너뜀 해제
 *
 * 선택이 없으면 호출부에서 렌더하지 않으므로 여기서는 selectedRecordIds.length > 0를
 * 가정한다 (호출부 가드는 그대로 유지).
 */
function BulkActionBar({
  statusFilter,
  selectedRecordIds,
  setSelectedRecordIds,
  year,
  bulk,
}: BulkActionBarProps) {
  return (
    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
      {statusFilter === 'CONFIRMED' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              선택 {selectedRecordIds.length}건
            </span>
            <button
              type="button"
              onClick={() => setSelectedRecordIds([])}
              className="text-xs text-blue-700 hover:underline"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={bulk.handleBulkUnconfirmSelected}
              disabled={bulk.isBulkUnconfirmPending}
              className="ml-auto px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 whitespace-nowrap"
            >
              선택 항목 확정 취소
            </button>
          </div>
          <p className="mt-2 text-xs text-blue-800">
            선택한 입금 내역의 확정을 취소합니다. 회원·월 수정 후 다시 확정해야
            합니다.
          </p>
        </>
      )}
      {statusFilter === 'MATCHED' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              선택 {selectedRecordIds.length}건
            </span>
            <button
              type="button"
              onClick={() => setSelectedRecordIds([])}
              className="text-xs text-blue-700 hover:underline"
            >
              선택 해제
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">연도:</span>
              <select
                value={bulk.bulkSelectionYear}
                onChange={(e) =>
                  bulk.setBulkSelectionYear(Number(e.target.value))
                }
                className="px-2 py-1 text-sm border rounded"
              >
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[20rem]">
              <MonthSelector
                selectedMonths={bulk.bulkSelectionMonths}
                onMonthsChange={bulk.setBulkSelectionMonths}
              />
            </div>
            <button
              type="button"
              onClick={bulk.handleBulkConfirmSelected}
              disabled={
                bulk.isBulkConfirmPending ||
                bulk.bulkSelectionMonths.length === 0
              }
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 whitespace-nowrap"
            >
              선택 항목 확정
            </button>
            <button
              type="button"
              onClick={bulk.handleBulkSkipSelected}
              disabled={bulk.isBulkSkipPending}
              className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 whitespace-nowrap"
            >
              선택 항목 건너뛰기
            </button>
          </div>
          <p className="mt-2 text-xs text-blue-800">
            선택한 회원들에게 위에서 고른 연도·월을 동일하게 적용합니다. (의무월
            외 / 이미 납부된 월은 자동으로 실패 처리됩니다)
            {' · '}정산에서 제외하려면 [선택 항목 건너뛰기]를 사용하세요.
          </p>
        </>
      )}
      {(statusFilter === 'PENDING' || statusFilter === 'ERROR') && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              선택 {selectedRecordIds.length}건
            </span>
            <button
              type="button"
              onClick={() => setSelectedRecordIds([])}
              className="text-xs text-blue-700 hover:underline"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={bulk.handleBulkSkipSelected}
              disabled={bulk.isBulkSkipPending}
              className="ml-auto px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 whitespace-nowrap"
            >
              선택 항목 건너뛰기
            </button>
          </div>
          <p className="mt-2 text-xs text-blue-800">
            {statusFilter === 'ERROR'
              ? '선택한 입금 내역을 건너뛰기 처리합니다. 에러 사유와 무관하게 정산 대상에서 제외됩니다.'
              : '선택한 입금 내역을 건너뛰기 처리합니다. 정산 대상에서 제외됩니다.'}
          </p>
        </>
      )}
      {statusFilter === 'SKIPPED' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-900">
              선택 {selectedRecordIds.length}건
            </span>
            <button
              type="button"
              onClick={() => setSelectedRecordIds([])}
              className="text-xs text-blue-700 hover:underline"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={bulk.handleBulkUnskipSelected}
              disabled={bulk.isBulkUnskipPending}
              className="ml-auto px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 whitespace-nowrap"
            >
              선택 항목 건너뜀 해제
            </button>
          </div>
          <p className="mt-2 text-xs text-blue-800">
            선택한 입금 내역의 건너뛰기를 해제합니다. 매칭 회원이 있으면
            매칭됨으로, 없으면 대기로 복원됩니다.
          </p>
        </>
      )}
    </div>
  );
}

export default BulkActionBar;

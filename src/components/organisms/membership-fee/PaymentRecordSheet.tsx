import { useState } from 'react';

import { Edit2, Plus, X } from 'lucide-react';

import { Button } from '@/components/atoms/buttons/Button';
import { IconButton } from '@/components/atoms/buttons/IconButton';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { StatusChip } from '@/components/atoms/StatusChip';
import { FormField } from '@/components/molecules/form/FormField';
import MemberMultiSelectDropdown from '@/components/molecules/membership-fee/MemberMultiSelectDropdown';
import MonthSelector from '@/components/molecules/membership-fee/MonthSelector';
import {
  confirmedLabel,
  FEE_RECORD_STATUS_LABEL,
  formatFeeAmount,
  formatMatchedMembers,
  formatTransactionDate,
  formatYearMonths,
  getNextMonth,
  getRecordMemberIds,
  groupSelectionsByYear,
  NON_FEE_KIND_LABEL,
  PAYMENT_KIND_LABEL,
  PaymentRecordMember,
  YearMonthSelection,
} from '@/components/organisms/membership-fee/paymentRecordDisplay';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { asksMemberCheck } from '@/lib/membership-fee/paymentKind';
import { cn } from '@/lib/utils';
import {
  NonFeeKind,
  PaymentRecord,
  PaymentRecordKind,
  PaymentRecordUpdateInput,
} from '@/types/membership-fee.types';

type YearMonth = { year: number; month: number };

const KIND_OPTIONS = (
  Object.keys(PAYMENT_KIND_LABEL) as PaymentRecordKind[]
).map((kind) => ({ value: kind, label: PAYMENT_KIND_LABEL[kind] }));
const NON_FEE_KIND_OPTIONS = (
  Object.keys(NON_FEE_KIND_LABEL) as NonFeeKind[]
).map((kind) => ({ value: kind, label: NON_FEE_KIND_LABEL[kind] }));

const sameMonths = (a: YearMonth[], b: YearMonth[]) =>
  formatYearMonths(a) === formatYearMonths(b);

export interface PaymentRecordActions {
  members: PaymentRecordMember[];
  /** 회계 연도. 연도 선택지(-1·0·+1)와 추천 월의 기준 */
  year: number;
  onUpdateMember: (recordId: string, memberIds: number[]) => void;
  /** 분류, 회비가 아닌 금액, 메모를 고친다 */
  onUpdateRecord: (recordId: string, data: PaymentRecordUpdateInput) => void;
  /** 매칭 회원의 회비 의무 시작월을 앞당긴다 */
  onAdvanceStartMonth: (record: PaymentRecord, startMonth: YearMonth) => void;
  onConfirm: (recordId: string, selections: YearMonthSelection[]) => void;
  onUnconfirm: (recordId: string) => void;
  onSkip: (recordId: string) => void;
  onUnskip: (recordId: string) => void;
  isUpdating?: boolean;
}

interface PaymentRecordSheetProps extends PaymentRecordActions {
  /** null이면 닫힌다 */
  record: PaymentRecord | null;
  onClose: () => void;
}

/**
 * 입금 내역 한 건의 상세. 회원을 고치고, 납부월을 골라 확정하거나 건너뛴다.
 * 표의 행 안 편집과 행 아래 펼침 패널이 하던 일을 모두 여기서 한다.
 */
export function PaymentRecordSheet({
  record,
  onClose,
  ...actions
}: PaymentRecordSheetProps) {
  // 닫히는 애니메이션 동안에도 내용이 남아 있도록 마지막으로 열었던 건을 들고 있는다.
  const [shown, setShown] = useState<PaymentRecord | null>(record);
  // 열 때마다 번호를 올려 안쪽을 새로 만든다. 고르던 월과 기본값이 "열 때 한 번" 잡히게 한다.
  const [session, setSession] = useState({
    seq: 0,
    id: record?.id ?? null,
  });

  if (record && record !== shown) setShown(record);
  const openId = record?.id ?? null;
  if (openId !== session.id) {
    setSession({ seq: openId ? session.seq + 1 : session.seq, id: openId });
  }

  if (!shown) return null;

  return (
    <RecordSheet
      key={session.seq}
      open={record !== null}
      record={shown}
      onClose={onClose}
      {...actions}
    />
  );
}

/**
 * 열 때의 기본 선택.
 * 서버가 배정한 달(월 힌트 → 밀린 달 순) → 차기 의무월 → 최종 납부월의 다음 달 → 추천 월 → 없음
 */
function initialSelections(
  record: PaymentRecord,
  year: number
): { selections: YearMonthSelection[]; addYear: number } {
  const assigned = record.suggestedSelections ?? [];
  if (assigned.length > 0) {
    const selections = groupSelectionsByYear(assigned);
    return { selections, addYear: selections[selections.length - 1].year };
  }
  const lastPaid = record.lastPaidYearMonth ?? null;
  // 백엔드가 휴회/탈퇴 반영해 내려준 차기 의무월을 우선 사용. fallback은 +1개월.
  const nextDefault =
    record.nextSuggestedYearMonth ?? (lastPaid ? getNextMonth(lastPaid) : null);
  if (nextDefault) {
    return {
      selections: [{ year: nextDefault.year, months: [nextDefault.month] }],
      addYear: nextDefault.year,
    };
  }
  const suggested = record.suggestedMonths ?? [];
  return {
    selections: suggested.length > 0 ? [{ year, months: suggested }] : [],
    addYear: year,
  };
}

function RecordSheet({
  open,
  record,
  onClose,
  members,
  year,
  onUpdateMember,
  onUpdateRecord,
  onAdvanceStartMonth,
  onConfirm,
  onUnconfirm,
  onSkip,
  onUnskip,
  isUpdating = false,
}: {
  open: boolean;
  record: PaymentRecord;
  onClose: () => void;
} & PaymentRecordActions) {
  const [initial] = useState(() => initialSelections(record, year));
  const [editingMember, setEditingMember] = useState(false);
  const [selections, setSelections] = useState(initial.selections);
  const [addYear, setAddYear] = useState(initial.addYear);
  const [addMonths, setAddMonths] = useState<number[]>([]);

  const memberIds = getRecordMemberIds(record);
  const hasMember = memberIds.length > 0;

  const [nonFeeAmountInput, setNonFeeAmountInput] = useState(
    record.nonFeeAmount ? String(record.nonFeeAmount) : ''
  );
  const [nonFeeKindInput, setNonFeeKindInput] = useState<NonFeeKind | ''>(
    record.nonFeeKind ?? ''
  );
  const [noteInput, setNoteInput] = useState(record.note ?? '');

  // 매칭 회원이나 서버의 배정이 바뀌면(회비가 아닌 금액을 뗌, 의무 시작월을 앞당김 등)
  // 고르던 월을 버리고 새 기본값으로 다시 잡는다. 그대로 두면 앞 회원·앞 금액의 월로 확정하게 된다.
  // 같은 회원·같은 배정인 채 데이터만 새로 올 때는 고르던 것을 지킨다.
  const memberKey = [
    memberIds.join(','),
    formatYearMonths(record.suggestedSelections ?? []),
  ].join('|');
  const [defaultsFor, setDefaultsFor] = useState(memberKey);
  if (memberKey !== defaultsFor) {
    const next = initialSelections(record, year);
    setDefaultsFor(memberKey);
    setSelections(next.selections);
    setAddYear(next.addYear);
    setAddMonths([]);
  }

  const canChange =
    record.status !== 'CONFIRMED' && record.status !== 'SKIPPED';
  const isFee = record.kind === 'FEE';
  const matchedNames = formatMatchedMembers(record);
  const reviewReasons = record.reviewReasons ?? [];
  // 이름이 비슷한 회원이나 동명이인 중 한 명에 자동으로 붙인 건
  const isUncertainMatch = asksMemberCheck(reviewReasons);

  const assigned = record.suggestedSelections ?? [];
  const hinted = record.monthHints?.months ?? [];
  // 입금자가 적은 달이 배정과 다를 때만 "적힌 달로" 고르게 한다
  const showHintChoice = hinted.length > 0 && !sameMonths(hinted, assigned);
  const hintSource = record.monthHints?.source === 'memo' ? '메모' : '입금자명';

  const nonFeeAmount = Number(nonFeeAmountInput) || 0;
  const applyNonFeeAmount = () =>
    onUpdateRecord(record.id, {
      nonFeeAmount,
      nonFeeKind: nonFeeAmount > 0 ? nonFeeKindInput || null : null,
    });

  const saveNote = () => {
    const note = noteInput.trim();
    if (note === (record.note ?? '')) return;
    onUpdateRecord(record.id, { note: note || null });
  };
  const totalMonthsCount = selections.reduce(
    (acc, s) => acc + s.months.length,
    0
  );

  const handleAddSelection = () => {
    if (addMonths.length === 0) return;
    const existing = selections.find((s) => s.year === addYear);
    setSelections(
      existing
        ? selections.map((s) =>
            s.year === addYear
              ? {
                  ...s,
                  months: [...new Set([...s.months, ...addMonths])].sort(
                    (a, b) => a - b
                  ),
                }
              : s
          )
        : [
            ...selections,
            { year: addYear, months: [...addMonths].sort((a, b) => a - b) },
          ]
    );
    setAddMonths([]);
  };

  const handleRemoveSelection = (index: number) => {
    setSelections(selections.filter((_, i) => i !== index));
  };

  /** 동작을 부르고 시트를 닫는다. 결과는 목록이 갱신되며 보인다. */
  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  const last = record.lastPaidYearMonth ?? null;
  // 백엔드가 명시적으로 null을 보내면 (탈퇴 등) 차기월을 추천하지 않음.
  // 필드 자체가 미정의(undefined)면 단순 +1로 fallback.
  const next =
    last === null || record.nextSuggestedYearMonth === null
      ? null
      : (record.nextSuggestedYearMonth ?? getNextMonth(last));
  const reasons = record.nextSuggestedReasons ?? [];

  const footer =
    record.status === 'CONFIRMED' ? (
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={isUpdating}
        onClick={run(() => onUnconfirm(record.id))}
      >
        확정 취소 후 수정
      </Button>
    ) : record.status === 'SKIPPED' ? (
      // 회비가 아닌 건은 해제가 아니라 분류를 회비로 바꿔야 회비 흐름으로 돌아온다
      isFee ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={isUpdating}
          onClick={run(() => onUnskip(record.id))}
        >
          건너뛰기 해제 후 수정
        </Button>
      ) : undefined
    ) : (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={isUpdating}
          onClick={run(() => onSkip(record.id))}
        >
          건너뛰기
        </Button>
        {hasMember && (
          <Button
            type="button"
            className="flex-1"
            disabled={
              totalMonthsCount === 0 || isUpdating || addMonths.length > 0
            }
            title={
              addMonths.length > 0
                ? '선택한 연도·월을 먼저 [추가]해주세요'
                : undefined
            }
            onClick={run(() => onConfirm(record.id, selections))}
          >
            확정
          </Button>
        )}
      </div>
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={record.depositorName}
      className="md:max-w-lg"
      footer={footer}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-callout text-secondary">
          <span>{formatTransactionDate(record.transactionDate)}</span>
          <span className="font-semibold text-primary">
            {record.amount.toLocaleString()}원
          </span>
          <StatusChip domain="feeRecord" status={record.status}>
            {FEE_RECORD_STATUS_LABEL[record.status]}
          </StatusChip>
          {!isFee && (
            <StatusChip domain="paymentKind" status={record.kind}>
              {PAYMENT_KIND_LABEL[record.kind]}
            </StatusChip>
          )}
        </div>
        {record.errorReason && (
          <p className="text-footnote text-negative">{record.errorReason}</p>
        )}
        {reviewReasons.length > 0 && (
          <ul aria-label="검토할 것" className="space-y-0.5">
            {reviewReasons.map((reason) => (
              <li key={reason} className="text-footnote text-warning">
                {reason}
              </li>
            ))}
          </ul>
        )}

        {/* 회비가 아닌 건은 회원을 매칭하지 않는다. 남겨 둔 회원(누구의 가입비인지)이 있을 때만 보인다. */}
        {(isFee || hasMember) && (
          <section
            aria-label="매칭 회원"
            // 회원 목록이 아래로 펼쳐진다. 시트 본문이 짧으면 목록이 그 안에 갇히므로 자리를 둔다.
            className={cn('space-y-1', editingMember && 'min-h-80')}
          >
            <h3 className="text-footnote font-medium text-secondary">
              매칭 회원
            </h3>
            {editingMember ? (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <MemberMultiSelectDropdown
                    members={members}
                    selectedMemberIds={memberIds}
                    onSelect={(ids) => onUpdateMember(record.id, ids)}
                    disabled={isUpdating}
                  />
                </div>
                <Button
                  type="button"
                  variant="plain"
                  size="sm"
                  className="mt-1.5"
                  onClick={() => setEditingMember(false)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-body text-primary">
                  {matchedNames || (
                    <span className="text-negative">미매칭</span>
                  )}
                </span>
                {canChange && (
                  <IconButton
                    aria-label="회원 수정"
                    title="회원 수정"
                    onClick={() => setEditingMember(true)}
                  >
                    <Edit2 aria-hidden className="h-4 w-4 text-secondary" />
                  </IconButton>
                )}
                {canChange && isUncertainMatch && hasMember && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => onUpdateMember(record.id, memberIds)}
                  >
                    이 회원이 맞음
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {record.status === 'CONFIRMED' && (
          <p className="text-callout text-positive">{confirmedLabel(record)}</p>
        )}

        {canChange && hasMember && isFee && (
          <section aria-label="납부월" className="space-y-2">
            <h3 className="text-footnote font-medium text-secondary">납부월</h3>

            {(showHintChoice ||
              record.partialPaidMonth ||
              record.suggestedStartMonth) && (
              <div className="flex flex-wrap gap-1">
                {showHintChoice && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelections(groupSelectionsByYear(hinted));
                      setAddMonths([]);
                    }}
                  >
                    {`${hintSource}에 적힌 달: ${formatYearMonths(hinted)}`}
                  </Button>
                )}
                {showHintChoice && assigned.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelections(groupSelectionsByYear(assigned));
                      setAddMonths([]);
                    }}
                  >
                    {`밀린 달부터: ${formatYearMonths(assigned)}`}
                  </Button>
                )}
                {record.partialPaidMonth && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelections(
                        groupSelectionsByYear([record.partialPaidMonth!])
                      );
                      setAddMonths([]);
                    }}
                  >
                    {`${formatYearMonths([record.partialPaidMonth])} 부족분 채우기`}
                  </Button>
                )}
                {record.suggestedStartMonth && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() =>
                      onAdvanceStartMonth(record, record.suggestedStartMonth!)
                    }
                  >
                    {`의무 시작월을 ${formatYearMonths([record.suggestedStartMonth])}로 앞당기기`}
                  </Button>
                )}
              </div>
            )}

            {last ? (
              <p className="text-footnote text-secondary">
                {`최종 납부월: ${last.year}년 ${last.month}월 · `}
                <span
                  className={
                    next ? 'font-semibold text-positive' : 'font-semibold'
                  }
                >
                  {next
                    ? `차기월(권장): ${next.year}년 ${next.month}월`
                    : '차기월(권장): 없음'}
                </span>
              </p>
            ) : (
              <p className="text-footnote text-secondary">
                최종 납부월: 없음 (첫 납부 또는 이전 확정 이력 없음)
              </p>
            )}
            {reasons.length > 0 && (
              <p className="ml-4 text-caption text-secondary">
                {`└ ${reasons.join(' · ')}`}
              </p>
            )}

            {selections.length > 0 && (
              <ul aria-label="확정할 연도·월" className="flex flex-wrap gap-1">
                {selections.map((sel, index) => {
                  const label = `${sel.year}년 ${sel.months.join(', ')}월`;
                  return (
                    <li
                      key={sel.year}
                      className="inline-flex items-center gap-1 rounded-sm bg-fill py-0.5 pl-2 pr-1 text-footnote text-primary"
                    >
                      <span>{label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelection(index)}
                        title="제거"
                        aria-label={`${label} 제거`}
                        className="rounded-full p-1 text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <X aria-hidden className="h-3 w-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <Select
                aria-label="연도"
                placeholder={null}
                fullWidth={false}
                value={String(addYear)}
                onChange={(e) => setAddYear(Number(e.target.value))}
                options={[year - 1, year, year + 1].map((y) => ({
                  value: String(y),
                  label: `${y}년`,
                }))}
              />
              <IconButton
                variant="filled"
                aria-label="선택한 연도·월 추가"
                title="선택한 연도·월 추가"
                onClick={handleAddSelection}
                disabled={addMonths.length === 0}
              >
                <Plus aria-hidden className="h-5 w-5" />
              </IconButton>
            </div>
            <MonthSelector
              selectedMonths={addMonths}
              onMonthsChange={setAddMonths}
            />
            <p className="text-caption text-secondary">
              연도·월 선택 후 + 버튼으로 추가 (여러 연도 가능)
            </p>
            {addMonths.length > 0 && (
              <p role="status" className="text-caption text-warning">
                {`선택한 ${addYear}년 ${addMonths.join(', ')}월을 위 [＋] 버튼으로 추가한 뒤 확정해주세요.`}
              </p>
            )}
          </section>
        )}

        {/* 회원과 납부월을 고르는 일이 가장 잦아 위에 두고, 분류·금액 나누기는 그 아래에 둔다. */}
        {/* 라벨은 입력칸이 갖는다. 묶음에 같은 이름을 또 주면 보조 기술이 두 번 읽는다. */}
        <section className="space-y-2">
          <FormField label="분류">
            <Select
              placeholder={null}
              value={record.kind}
              disabled={record.status === 'CONFIRMED' || isUpdating}
              onChange={(e) =>
                onUpdateRecord(record.id, {
                  kind: e.target.value as PaymentRecordKind,
                })
              }
              options={KIND_OPTIONS}
            />
          </FormField>
          {record.kindReason && (
            <p className="text-caption text-secondary">{record.kindReason}</p>
          )}
          {!isFee && record.status !== 'CONFIRMED' && (
            <p className="text-caption text-secondary">
              분류를 회비로 바꾸면 회비로 처리할 수 있습니다.
            </p>
          )}

          {isFee && canChange && (
            <div className="space-y-1">
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-36">
                  <FormField label="회비가 아닌 금액">
                    <Input
                      type="number"
                      min={0}
                      max={record.amount - 1}
                      inputMode="numeric"
                      value={nonFeeAmountInput}
                      onChange={(e) => setNonFeeAmountInput(e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                </div>
                <div className="w-36">
                  <FormField label="회비가 아닌 금액의 성격">
                    <Select
                      placeholder="고르기"
                      value={nonFeeKindInput}
                      onChange={(e) =>
                        setNonFeeKindInput(e.target.value as NonFeeKind | '')
                      }
                      options={NON_FEE_KIND_OPTIONS}
                    />
                  </FormField>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mb-1"
                  disabled={
                    isUpdating ||
                    nonFeeAmount >= record.amount ||
                    (nonFeeAmount > 0 && !nonFeeKindInput)
                  }
                  onClick={applyNonFeeAmount}
                >
                  적용
                </Button>
              </div>
              <p className="text-caption text-secondary">
                가입비·콕 값처럼 회비와 함께 들어온 금액을 떼어 냅니다.
                {record.nonFeeAmount > 0 && ` 지금: ${formatFeeAmount(record)}`}
              </p>
            </div>
          )}
        </section>

        <section>
          <FormField label="메모">
            <Input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onBlur={saveNote}
              placeholder="처리 메모 (예: 4월 병가, 5월로 이월)"
              maxLength={500}
            />
          </FormField>
        </section>
      </div>
    </Sheet>
  );
}

export default PaymentRecordSheet;

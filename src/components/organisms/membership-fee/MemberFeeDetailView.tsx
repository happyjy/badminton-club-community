import { useState } from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { StatusChip } from '@/components/atoms/StatusChip';
import { FormField } from '@/components/molecules/form/FormField';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { Notice } from '@/components/molecules/Notice';
import { Sheet } from '@/components/organisms/sheet/Sheet';

export interface ClubMemberDetail {
  id: number;
  name: string | null;
  status: string;
  createdAt: string;
  feeObligationStartAt: string | null;
  leftAt: string | null;
  /** 직책 (회장·총무 등). 납부현황 내보내기의 비고 */
  position?: string | null;
  /** 직책 있는 회원끼리의 정렬 순서 */
  positionOrder?: number | null;
}

export interface MemberLeaveItem {
  id: number;
  clubMemberId: number;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  reason: string | null;
  createdAt: string;
}

/** 의무가 없는 달(휴회·가입 전·탈퇴 후)에 걸려 있는 납부 */
export interface OrphanPayment {
  id: string;
  year: number;
  month: number;
  amount: number;
}

/** 휴회 폼의 값. start·end는 'YYYY-MM', end가 비면 미정 */
export interface LeaveFormValue {
  /** 수정이면 그 휴회의 id, 추가면 null */
  editingId: number | null;
  start: string;
  end: string;
  reason: string;
}

interface MemberFeeDetailViewProps {
  member: ClubMemberDetail;
  leaves: MemberLeaveItem[];
  saving: boolean;
  /** 'YYYY-MM' */
  feeStartInput: string;
  onChangeFeeStart: (value: string) => void;
  onSaveFeeStart: () => void;
  /** 'YYYY-MM-DD' */
  leftAtInput: string;
  onChangeLeftAt: (value: string) => void;
  /** 'YYYY-MM' */
  feeEndInput: string;
  onChangeFeeEnd: (value: string) => void;
  onSaveLeftInfo: () => void;
  /** 저장에 성공하면 true. 그때 시트를 닫는다 */
  onSubmitLeave: (value: LeaveFormValue) => Promise<boolean>;
  onDeleteLeave: (leaveId: number) => void;
  positionInput: string;
  onChangePosition: (value: string) => void;
  /** 숫자 입력칸의 값 그대로 (비어 있으면 '') */
  positionOrderInput: string;
  onChangePositionOrder: (value: string) => void;
  onSavePosition: () => void;
  /** 있으면 다음 의무월로 옮기라고 안내한다 */
  orphanPayments: OrphanPayment[];
  onShiftPayments: () => void;
}

const EMPTY_FORM: LeaveFormValue = {
  editingId: null,
  start: '',
  end: '',
  reason: '',
};

const pad = (month: number) => String(month).padStart(2, '0');

function formatLeaveRange(leave: MemberLeaveItem) {
  const start = `${leave.startYear}.${pad(leave.startMonth)}`;
  const end =
    leave.endYear != null && leave.endMonth != null
      ? `${leave.endYear}.${pad(leave.endMonth)}`
      : '미정';
  return `${start} ~ ${end}`;
}

/** "2026년 4월 25,000원" */
export const formatOrphanPayment = (payment: OrphanPayment) =>
  `${payment.year}년 ${payment.month}월 ${payment.amount.toLocaleString('ko-KR')}원`;

const hintClass = 'text-caption text-secondary';

/** 회원 상세의 본문: 기본 정보, 회비 설정, 휴회/병가 기간. */
export function MemberFeeDetailView({
  member,
  leaves,
  saving,
  feeStartInput,
  onChangeFeeStart,
  onSaveFeeStart,
  leftAtInput,
  onChangeLeftAt,
  feeEndInput,
  onChangeFeeEnd,
  onSaveLeftInfo,
  onSubmitLeave,
  onDeleteLeave,
  positionInput,
  onChangePosition,
  positionOrderInput,
  onChangePositionOrder,
  onSavePosition,
  orphanPayments,
  onShiftPayments,
}: MemberFeeDetailViewProps) {
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState<LeaveFormValue>(EMPTY_FORM);
  const isLeft = member.status === 'LEFT';

  const openAddLeave = () => {
    setLeaveForm(EMPTY_FORM);
    setIsLeaveOpen(true);
  };

  const openEditLeave = (leave: MemberLeaveItem) => {
    setLeaveForm({
      editingId: leave.id,
      start: `${leave.startYear}-${pad(leave.startMonth)}`,
      end:
        leave.endYear != null && leave.endMonth != null
          ? `${leave.endYear}-${pad(leave.endMonth)}`
          : '',
      reason: leave.reason ?? '',
    });
    setIsLeaveOpen(true);
  };

  const submitLeave = async () => {
    if (await onSubmitLeave(leaveForm)) setIsLeaveOpen(false);
  };

  const deleteLeave = () => {
    if (leaveForm.editingId == null) return;
    onDeleteLeave(leaveForm.editingId);
    setIsLeaveOpen(false);
  };

  return (
    <div className="space-y-6">
      <ListGroup label="기본 정보">
        <ListRow
          title="가입일 (클럽)"
          trailing={
            <span className="text-callout text-secondary">
              {member.createdAt
                ? new Date(member.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '-'}
            </span>
          }
        />
        {isLeft && (
          <ListRow
            title="상태"
            trailing={<StatusChip tone="negative">탈퇴</StatusChip>}
          />
        )}
      </ListGroup>

      <ListGroup label="회비 설정">
        <div className="space-y-1 px-4 py-3">
          <h4 className="text-footnote font-semibold text-primary">
            입금 시작
          </h4>
          <FormField label="시작월">
            <Input
              type="month"
              value={feeStartInput}
              onChange={(e) => onChangeFeeStart(e.target.value)}
              className="max-w-xs"
            />
          </FormField>
          <p className={hintClass}>
            기본은 가입한 달. 필요 시 다음 달부터로 설정할 수 있습니다.
          </p>
        </div>

        {isLeft && (
          <div className="space-y-2 px-4 py-3">
            <h4 className="text-footnote font-semibold text-primary">
              탈퇴 종료
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FormField label="탈퇴일">
                  <Input
                    type="date"
                    value={leftAtInput}
                    onChange={(e) => onChangeLeftAt(e.target.value)}
                  />
                </FormField>
                <p className={hintClass}>
                  상태 변경 시 자동 설정. 필요 시 수정 가능.
                </p>
              </div>
              <div className="space-y-1">
                <FormField label="마지막 월">
                  <Input
                    type="month"
                    value={feeEndInput}
                    onChange={(e) => onChangeFeeEnd(e.target.value)}
                  />
                </FormField>
                <p className={hintClass}>
                  마지막 회비 의무 월. 기본은 탈퇴일의 해당 월.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-3">
          <Button
            type="button"
            size="sm"
            onClick={isLeft ? onSaveLeftInfo : onSaveFeeStart}
            pending={saving}
            pendingText="저장 중…"
            pendingPosition="left"
          >
            저장
          </Button>
        </div>
      </ListGroup>

      <ListGroup
        label="직책"
        footer="납부현황 내보내기의 비고에 적히고, 직책이 있는 회원이 표의 위쪽에 정렬 순서대로 나옵니다."
      >
        <div className="space-y-3 px-4 py-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="직책">
              <Input
                type="text"
                value={positionInput}
                onChange={(e) => onChangePosition(e.target.value)}
                placeholder="회장, 총무, 재무, 감사, 이사 등"
                maxLength={20}
              />
            </FormField>
            <FormField label="정렬 순서">
              <Input
                type="number"
                min={1}
                value={positionOrderInput}
                onChange={(e) => onChangePositionOrder(e.target.value)}
                placeholder="작을수록 위"
              />
            </FormField>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onSavePosition}
            pending={saving}
            pendingText="저장 중…"
            pendingPosition="left"
          >
            직책 저장
          </Button>
        </div>
      </ListGroup>

      <section>
        {orphanPayments.length > 0 && (
          <Notice
            tone="warning"
            action={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onShiftPayments}
                disabled={saving}
              >
                다음 의무월로 이월
              </Button>
            }
          >
            <p>
              의무가 없는 달에 낸 회비 {orphanPayments.length}건이 있습니다.
            </p>
            <p>{orphanPayments.map(formatOrphanPayment).join(', ')}</p>
          </Notice>
        )}
        <ListGroup
          label="휴회/병가 기간"
          footer="휴회 기간은 회비 의무에서 제외됩니다. 기간 제한 없이 등록할 수 있습니다."
        >
          {leaves.map((leave, index) => (
            <ListRow
              key={leave.id}
              title={`${index + 1}회차: ${formatLeaveRange(leave)}${
                leave.reason ? ` (${leave.reason})` : ''
              }`}
              onClick={() => openEditLeave(leave)}
            />
          ))}
          <div className="px-4 py-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={openAddLeave}
            >
              <Plus aria-hidden className="mr-1 h-4 w-4" />
              휴회 추가
            </Button>
          </div>
        </ListGroup>
      </section>

      <Sheet
        open={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        title={leaveForm.editingId == null ? '휴회 추가' : '휴회 수정'}
        footer={
          <div className="flex gap-2">
            {leaveForm.editingId != null && (
              <Button
                type="button"
                variant="destructive"
                onClick={deleteLeave}
                disabled={saving}
              >
                삭제
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              className="ml-auto"
              onClick={() => setIsLeaveOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={submitLeave}
              pending={saving}
              pendingText="저장 중…"
              pendingPosition="left"
            >
              저장
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="시작 연월" required>
            <Input
              type="month"
              value={leaveForm.start}
              onChange={(e) =>
                setLeaveForm((prev) => ({ ...prev, start: e.target.value }))
              }
            />
          </FormField>
          <FormField label="종료 연월 (미입력 시 미정)">
            <Input
              type="month"
              value={leaveForm.end}
              onChange={(e) =>
                setLeaveForm((prev) => ({ ...prev, end: e.target.value }))
              }
            />
          </FormField>
          <FormField label="사유 (선택, 예: 병가, 출산)">
            <Input
              type="text"
              value={leaveForm.reason}
              onChange={(e) =>
                setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="병가, 출산, 일반 휴가 등"
              maxLength={200}
            />
          </FormField>
        </div>
      </Sheet>
    </div>
  );
}

export default MemberFeeDetailView;

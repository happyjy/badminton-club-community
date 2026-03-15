import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/router';

import axios from 'axios';

import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

interface ClubMemberDetail {
  id: number;
  name: string | null;
  status: string;
  createdAt: string;
  feeObligationStartAt: string | null;
}

interface MemberLeaveItem {
  id: number;
  clubMemberId: number;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  reason: string | null;
  createdAt: string;
}

function MemberDetailPage() {
  const router = useRouter();
  const { id: clubId, userId } = router.query;
  const [member, setMember] = useState<ClubMemberDetail | null>(null);
  const [leaves, setLeaves] = useState<MemberLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeStartInput, setFeeStartInput] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [leaveForm, setLeaveForm] = useState<{
    open: boolean;
    editingId: number | null;
    start: string;
    end: string;
    reason: string;
  }>({ open: false, editingId: null, start: '', end: '', reason: '' });

  const fetchLeaves = useCallback(async () => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    try {
      const res = await axios.get(
        `/api/clubs/${clubId}/members/${userId}/leaves`
      );
      const list = res.data?.data?.leaves ?? [];
      setLeaves(list);
    } catch {
      setLeaves([]);
    }
  }, [clubId, userId]);

  useEffect(() => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;

    const fetchMember = async () => {
      try {
        const res = await axios.get(`/api/clubs/${clubId}/members/${userId}`);
        const data = res.data?.data?.clubMember;
        if (data) {
          setMember(data);
          setFeeStartInput(
            data.feeObligationStartAt
              ? new Date(data.feeObligationStartAt).toISOString().slice(0, 7)
              : ''
          );
        }
      } catch {
        setMember(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [clubId, userId]);

  useEffect(() => {
    if (!member) return;
    fetchLeaves();
  }, [member, fetchLeaves]);

  const onSaveFeeStart = async () => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    setSaving(true);
    setMessage(null);
    try {
      await axios.patch(
        `/api/clubs/${clubId}/members/${userId}/fee-obligation`,
        {
          feeObligationStartAt: feeStartInput
            ? new Date(`${feeStartInput}-01`).toISOString()
            : null,
        }
      );
      setMessage({
        type: 'success',
        text: '회비 입금 시작월이 저장되었습니다.',
      });
      if (member) {
        setMember({
          ...member,
          feeObligationStartAt: feeStartInput
            ? new Date(`${feeStartInput}-01`).toISOString()
            : null,
        });
      }
    } catch {
      setMessage({ type: 'error', text: '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const onOpenAddLeave = () => {
    setLeaveForm({
      open: true,
      editingId: null,
      start: '',
      end: '',
      reason: '',
    });
    setMessage(null);
  };

  const onOpenEditLeave = (leave: MemberLeaveItem) => {
    setLeaveForm({
      open: true,
      editingId: leave.id,
      start: `${leave.startYear}-${String(leave.startMonth).padStart(2, '0')}`,
      end:
        leave.endYear != null && leave.endMonth != null
          ? `${leave.endYear}-${String(leave.endMonth).padStart(2, '0')}`
          : '',
      reason: leave.reason ?? '',
    });
    setMessage(null);
  };

  const onCloseLeaveForm = () => {
    setLeaveForm((prev) => ({ ...prev, open: false }));
  };

  const onSubmitLeave = async () => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    if (!leaveForm.start) {
      setMessage({ type: 'error', text: '시작 연월을 입력해주세요.' });
      return;
    }
    const [startYear, startMonth] = leaveForm.start.split('-').map(Number);
    const body: {
      startYear: number;
      startMonth: number;
      endYear?: number | null;
      endMonth?: number | null;
      reason?: string;
    } = {
      startYear,
      startMonth,
      reason: leaveForm.reason.trim() || undefined,
    };
    if (leaveForm.end) {
      const [endYear, endMonth] = leaveForm.end.split('-').map(Number);
      body.endYear = endYear;
      body.endMonth = endMonth;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (leaveForm.editingId) {
        await axios.patch(
          `/api/clubs/${clubId}/members/${userId}/leaves/${leaveForm.editingId}`,
          body
        );
        setMessage({ type: 'success', text: '휴회 기간을 수정했습니다.' });
      } else {
        await axios.post(`/api/clubs/${clubId}/members/${userId}/leaves`, body);
        setMessage({ type: 'success', text: '휴회 기간을 등록했습니다.' });
      }
      onCloseLeaveForm();
      fetchLeaves();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : null;
      setMessage({
        type: 'error',
        text: msg ?? '저장에 실패했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  const onDeleteLeave = async (leaveId: number) => {
    if (
      !clubId ||
      !userId ||
      typeof clubId !== 'string' ||
      typeof userId !== 'string'
    )
      return;
    if (!window.confirm('이 휴회 기간을 삭제할까요?')) return;
    setSaving(true);
    setMessage(null);
    try {
      await axios.delete(
        `/api/clubs/${clubId}/members/${userId}/leaves/${leaveId}`
      );
      setMessage({ type: 'success', text: '휴회 기간을 삭제했습니다.' });
      fetchLeaves();
    } catch {
      setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const formatLeaveRange = (leave: MemberLeaveItem) => {
    const start = `${leave.startYear}.${String(leave.startMonth).padStart(2, '0')}`;
    const end =
      leave.endYear != null && leave.endMonth != null
        ? `${leave.endYear}.${String(leave.endMonth).padStart(2, '0')}`
        : '미정';
    return `${start} ~ ${end}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-500">회원 정보를 불러올 수 없습니다.</p>
        <Link
          href={`/clubs/${clubId}/members`}
          className="text-blue-600 underline mt-2 inline-block"
        >
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link
        href={`/clubs/${clubId}/members`}
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        ← 클럽 멤버 관리
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        {member.name || '이름 없음'} 회원 상세
      </h1>

      <div className="space-y-4 mb-6">
        <div>
          <span className="text-gray-500 text-sm">가입일 (클럽)</span>
          <p className="font-medium">
            {member.createdAt
              ? new Date(member.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '-'}
          </p>
        </div>

        <div>
          <label
            htmlFor="feeStart"
            className="block text-gray-500 text-sm mb-1"
          >
            회비 입금 시작월
          </label>
          <p className="text-xs text-gray-400 mb-1">
            기본은 가입한 달. 필요 시 다음 달부터로 설정할 수 있습니다.
          </p>
          <input
            id="feeStart"
            type="month"
            value={feeStartInput}
            onChange={(e) => setFeeStartInput(e.target.value)}
            className="border rounded px-3 py-2 w-full max-w-xs"
          />
          <button
            type="button"
            onClick={onSaveFeeStart}
            disabled={saving}
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>

        {message && (
          <p
            className={
              message.type === 'success'
                ? 'text-green-600 text-sm'
                : 'text-red-600 text-sm'
            }
          >
            {message.text}
          </p>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-2">휴회/병가 기간</h2>
          <p className="text-xs text-gray-400 mb-2">
            휴회 기간은 회비 의무에서 제외됩니다. 기간 제한 없이 등록할 수
            있습니다.
          </p>
          <ul className="space-y-2 mb-2">
            {leaves.map((leave, index) => (
              <li
                key={leave.id}
                className="flex items-center justify-between border rounded px-3 py-2 bg-gray-50"
              >
                <span className="text-sm">
                  {index + 1}회차: {formatLeaveRange(leave)}
                  {leave.reason ? ` (${leave.reason})` : ''}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenEditLeave(leave)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteLeave(leave.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    삭제
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {leaveForm.open ? (
            <div className="border rounded p-4 bg-gray-50 space-y-3">
              <div>
                <label className="block text-gray-500 text-sm mb-1">
                  시작 연월 <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={leaveForm.start}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="border rounded px-3 py-2 w-full max-w-xs"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-sm mb-1">
                  종료 연월 (미입력 시 미정)
                </label>
                <input
                  type="month"
                  value={leaveForm.end}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="border rounded px-3 py-2 w-full max-w-xs"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-sm mb-1">
                  사유 (선택, 예: 병가, 출산)
                </label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="병가, 출산, 일반 휴가 등"
                  className="border rounded px-3 py-2 w-full max-w-md"
                  maxLength={200}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onSubmitLeave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={onCloseLeaveForm}
                  disabled={saving}
                  className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAddLeave}
              className="px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
            >
              휴회 추가
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(MemberDetailPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});

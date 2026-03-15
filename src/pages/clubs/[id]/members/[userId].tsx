import { useEffect, useState } from 'react';

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

function MemberDetailPage() {
  const router = useRouter();
  const { id: clubId, userId } = router.query;
  const [member, setMember] = useState<ClubMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeStartInput, setFeeStartInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!clubId || !userId || typeof clubId !== 'string' || typeof userId !== 'string') return;

    const fetchMember = async () => {
      try {
        const res = await axios.get(`/api/clubs/${clubId}/members/${userId}`);
        const data = res.data?.data?.clubMember;
        if (data) {
          setMember(data);
          setFeeStartInput(
            data.feeObligationStartAt
              ? new Date(data.feeObligationStartAt).toISOString().slice(0, 10)
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

  const onSaveFeeStart = async () => {
    if (!clubId || !userId || typeof clubId !== 'string' || typeof userId !== 'string') return;
    setSaving(true);
    setMessage(null);
    try {
      await axios.patch(`/api/clubs/${clubId}/members/${userId}/fee-obligation`, {
        feeObligationStartAt: feeStartInput ? new Date(feeStartInput).toISOString() : null,
      });
      setMessage({ type: 'success', text: '회비 입금 시작일이 저장되었습니다.' });
      if (member) {
        setMember({
          ...member,
          feeObligationStartAt: feeStartInput ? new Date(feeStartInput).toISOString() : null,
        });
      }
    } catch {
      setMessage({ type: 'error', text: '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
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
        <Link href={`/clubs/${clubId}/members`} className="text-blue-600 underline mt-2 inline-block">
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

      <h1 className="text-2xl font-bold mb-6">{member.name || '이름 없음'} 회원 상세</h1>

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
          <label htmlFor="feeStart" className="block text-gray-500 text-sm mb-1">
            회비 입금 시작일
          </label>
          <p className="text-xs text-gray-400 mb-1">
            15일 이전이면 해당 월부터, 16일~말일이면 다음 달부터 회비 의무입니다.
          </p>
          <input
            id="feeStart"
            type="date"
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
              message.type === 'success' ? 'text-green-600 text-sm' : 'text-red-600 text-sm'
            }
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

export default withAuth(MemberDetailPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});

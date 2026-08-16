import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import TournamentStatusBadge from '@/components/organisms/tournament/TournamentStatusBadge';

import { useTournamentDetail } from '@/hooks/useTournamentDetail';

import { formatFee } from '@/lib/tournament/display';
import { RootState } from '@/store';
import { Role } from '@/types/enums';
import { renderContentWithLinks } from '@/utils/renderContentWithLinks';

function TournamentDetailPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const tournamentId = router.query.tournamentId as string | undefined;

  const { data: detail, isLoading } = useTournamentDetail(clubId, tournamentId);
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const isAdmin = clubMember?.role === Role.ADMIN;

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }
  if (!detail) {
    return (
      <div className="p-6 text-center text-gray-500">
        대회를 찾을 수 없습니다.
      </div>
    );
  }

  const { tournament, effectiveStatus, myEntryId } = detail;
  const basePath = `/clubs/${clubId}/tournaments/${tournamentId}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{tournament.title}</h1>
          <TournamentStatusBadge status={effectiveStatus} />
        </div>
        {tournament.hostName && (
          <p className="mt-1 text-sm text-gray-500">{tournament.hostName}</p>
        )}
      </header>

      <section className="space-y-2 rounded-lg border border-gray-200 p-4 text-sm">
        {tournament.tournamentDate && (
          <p>
            <span className="text-gray-400">대회일 </span>
            {tournament.tournamentDate}
          </p>
        )}
        {tournament.location && (
          <p>
            <span className="text-gray-400">장소 </span>
            {tournament.location}
          </p>
        )}
        <p>
          <span className="text-gray-400">신청 마감 </span>
          {new Date(tournament.applyDeadline).toLocaleString('ko-KR')}
        </p>
        {tournament.bankAccount && (
          <p>
            <span className="text-gray-400">입금 계좌 </span>
            {tournament.bankAccount}
          </p>
        )}
      </section>

      {tournament.description && (
        <section>
          <h2 className="mb-2 font-semibold">모집 요강</h2>
          <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            {renderContentWithLinks(tournament.description)}
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">종목 및 참가비</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">종목</th>
                <th className="py-2">인원</th>
                <th className="py-2 text-right">참가비</th>
              </tr>
            </thead>
            <tbody>
              {tournament.eventTypes
                .filter((eventType) => eventType.isActive)
                .map((eventType) => (
                  <tr key={eventType.id} className="border-b last:border-0">
                    <td className="py-2">{eventType.name}</td>
                    <td className="py-2">{eventType.playerCount}명</td>
                    <td className="py-2 text-right">
                      {formatFee(eventType.fee)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-1 text-sm">
        <p>
          <span className="text-gray-400">연령 </span>
          {tournament.ageGroups.join(', ')}
        </p>
        {tournament.levels.length > 0 && (
          <p>
            <span className="text-gray-400">급수 </span>
            {tournament.levels.join(', ')}
          </p>
        )}
      </section>

      <div className="space-y-2">
        {effectiveStatus === 'OPEN' && (
          <button
            type="button"
            onClick={() => router.push(`${basePath}/apply`)}
            className="w-full rounded-md bg-blue-600 py-3 font-medium text-white"
          >
            {myEntryId ? '신청 내용 수정' : '신청하기'}
          </button>
        )}
        {myEntryId && (
          <button
            type="button"
            onClick={() => router.push(`${basePath}/my`)}
            className="w-full rounded-md border border-gray-300 py-3 font-medium text-gray-700"
          >
            내 신청 확인
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push(`${basePath}/admin`)}
            className="w-full rounded-md border border-blue-600 py-3 font-medium text-blue-600"
          >
            신청 현황 관리
          </button>
        )}
      </div>
    </div>
  );
}

export default TournamentDetailPage;

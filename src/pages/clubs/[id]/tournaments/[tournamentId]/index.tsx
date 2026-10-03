import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import { PageHeader } from '@/components/organisms/PageHeader';
import TournamentFileList from '@/components/organisms/tournament/TournamentFileList';
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
    return <div className="p-6 text-center text-secondary">불러오는 중...</div>;
  }
  if (!detail) {
    return (
      <div className="p-6 text-center text-secondary">
        대회를 찾을 수 없습니다.
      </div>
    );
  }

  const { tournament, effectiveStatus, myEntryId, myEntryPaymentStatus } =
    detail;
  const basePath = `/clubs/${clubId}/tournaments/${tournamentId}`;
  // 전체 취소된 신청서는 수정이 아니라 재신청으로 안내한다
  const isEntryCanceled = myEntryPaymentStatus === 'CANCELED';
  const applyButtonLabel = !myEntryId
    ? '신청하기'
    : isEntryCanceled
      ? '다시 신청하기'
      : '신청 내용 수정';

  return (
    <div className="space-y-6">
      <PageHeader
        title={tournament.title}
        subtitle={tournament.hostName || undefined}
        backHref={`/clubs/${clubId}/tournaments`}
        wrapTitle
        action={<TournamentStatusBadge status={effectiveStatus} />}
        className="mb-0"
      />

      <section className="space-y-2 rounded-md bg-surface p-4 text-body text-primary">
        {tournament.tournamentDate && (
          <p>
            <span className="text-secondary">대회일 </span>
            {tournament.tournamentDate}
          </p>
        )}
        {tournament.location && (
          <p>
            <span className="text-secondary">장소 </span>
            {tournament.location}
          </p>
        )}
        <p>
          <span className="text-secondary">신청 마감 </span>
          {new Date(tournament.applyDeadline).toLocaleString('ko-KR')}
        </p>
        {tournament.bankAccount && (
          <p>
            <span className="text-secondary">입금 계좌 </span>
            {tournament.bankAccount}
          </p>
        )}
      </section>

      {(tournament.description || tournament.files?.length) && (
        <section className="space-y-3">
          <h2 className="px-4 text-footnote text-secondary">모집 요강</h2>
          {tournament.description && (
            <p className="whitespace-pre-wrap break-words rounded-md bg-surface p-4 text-body text-primary">
              {renderContentWithLinks(tournament.description)}
            </p>
          )}
          <TournamentFileList files={tournament.files} />
        </section>
      )}

      <section>
        <h2 className="px-4 pb-2 text-footnote text-secondary">
          종목 및 참가비
        </h2>
        <div className="overflow-x-auto rounded-md bg-surface px-4">
          <table className="w-full text-body text-primary">
            <thead>
              <tr className="border-b border-border text-left text-footnote text-secondary">
                <th className="py-2">종목</th>
                <th className="py-2">인원</th>
                <th className="py-2 text-right">참가비</th>
              </tr>
            </thead>
            <tbody>
              {tournament.eventTypes
                .filter((eventType) => eventType.isActive)
                .map((eventType) => (
                  <tr
                    key={eventType.id}
                    className="border-b border-border last:border-0"
                  >
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

      <section className="space-y-1 rounded-md bg-surface p-4 text-body text-primary">
        <p>
          <span className="text-secondary">연령 </span>
          {tournament.ageGroups.join(', ')}
        </p>
        {tournament.levels.length > 0 && (
          <p>
            <span className="text-secondary">급수 </span>
            {tournament.levels.join(', ')}
          </p>
        )}
      </section>

      <div className="space-y-2">
        {effectiveStatus === 'OPEN' && (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => router.push(`${basePath}/apply`)}
          >
            {applyButtonLabel}
          </Button>
        )}
        {myEntryId && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => router.push(`${basePath}/my`)}
          >
            내 신청 확인
          </Button>
        )}
        {isAdmin && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => router.push(`${basePath}/admin`)}
          >
            신청 현황 관리
          </Button>
        )}
      </div>
    </div>
  );
}

export default TournamentDetailPage;

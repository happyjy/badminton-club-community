import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import TournamentCard from '@/components/organisms/tournament/TournamentCard';

import { useTournaments } from '@/hooks/useTournaments';

import { RootState } from '@/store';
import { Role } from '@/types/enums';

function TournamentListPage() {
  const router = useRouter();
  const clubId = router.query.id as string | undefined;
  const { data: tournaments, isLoading } = useTournaments(clubId);

  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const isAdmin = clubMember?.role === Role.ADMIN;

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">대회 참가 신청</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push(`/clubs/${clubId}/tournaments/new`)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            대회 만들기
          </button>
        )}
      </div>

      {tournaments && tournaments.length > 0 ? (
        <div className="space-y-3">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="space-y-1">
              <TournamentCard
                tournament={tournament}
                onClick={() =>
                  router.push(`/clubs/${clubId}/tournaments/${tournament.id}`)
                }
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/clubs/${clubId}/tournaments/new?copyFrom=${tournament.id}`
                    )
                  }
                  className="text-xs text-gray-400 hover:text-blue-600"
                >
                  이 대회 복사해서 새로 만들기
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
          등록된 대회가 없습니다.
        </p>
      )}
    </div>
  );
}

export default TournamentListPage;

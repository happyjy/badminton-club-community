import { useRouter } from 'next/router';

import { Trophy } from 'lucide-react';
import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { EmptyState } from '@/components/molecules/EmptyState';
import { PageHeader } from '@/components/organisms/PageHeader';
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
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="대회"
        action={
          isAdmin && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/clubs/${clubId}/tournaments/new`)}
            >
              대회 만들기
            </Button>
          )
        }
      />

      {tournaments && tournaments.length > 0 ? (
        <div className="space-y-3">
          {tournaments.map((tournament) => (
            <div key={tournament.id}>
              <TournamentCard
                tournament={tournament}
                onClick={() =>
                  router.push(`/clubs/${clubId}/tournaments/${tournament.id}`)
                }
              />
              {isAdmin && (
                <Button
                  type="button"
                  variant="plain"
                  size="sm"
                  className="text-secondary"
                  onClick={() =>
                    router.push(
                      `/clubs/${clubId}/tournaments/new?copyFrom=${tournament.id}`
                    )
                  }
                >
                  이 대회 복사해서 새로 만들기
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md bg-surface">
          <EmptyState icon={Trophy} title="등록된 대회가 아직 없어요" />
        </div>
      )}
    </div>
  );
}

export default TournamentListPage;

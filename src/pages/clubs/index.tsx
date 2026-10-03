import { useEffect, useState } from 'react';

import { Users } from 'lucide-react';
import { useDispatch } from 'react-redux';

import { Spinner } from '@/components/atoms/Spinner';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ClubListItem } from '@/components/organisms/navigation/clubNavigation/ClubListItem';
import { PageHeader } from '@/components/organisms/PageHeader';

import { initialState, setClubData } from '@/store/features/clubSlice';
import { Club } from '@/types';

function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await fetch('/api/clubs');
        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        setClubs(result.data.clubs);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '클럽 목록을 불러오는데 실패했습니다'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubs();
  }, []);

  useEffect(() => {
    dispatch(setClubData(initialState.currentClub));
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="py-10 text-center text-body text-negative">
        {error}
      </p>
    );
  }

  return (
    <div>
      <PageHeader title="클럽" />
      {clubs.length > 0 ? (
        <ListGroup>
          {clubs.map((club) => (
            <ClubListItem key={club.id} club={club} />
          ))}
        </ListGroup>
      ) : (
        <div className="rounded-md bg-surface">
          <EmptyState icon={Users} title="등록된 클럽이 아직 없어요" />
        </div>
      )}
    </div>
  );
}

export default ClubsPage;

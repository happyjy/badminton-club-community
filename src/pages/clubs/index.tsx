import { useEffect, useState } from 'react';
import { Club } from '@/types';
import { ClubListItem } from '@/components/clubs/ClubListItem';
import { useDispatch } from 'react-redux';
import { initialState, setClubData } from '@/store/features/clubSlice';

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col space-y-4">
          {clubs.map((club) => (
            <ClubListItem key={club.id} club={club} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default ClubsPage;

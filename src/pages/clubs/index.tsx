import { useEffect, useState } from 'react';
import { withAuth } from '@/lib/withAuth';
import { Club } from '@/types';

function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">클럽 목록</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => (
          <div
            key={club.id}
            className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white"
          >
            <h2 className="font-semibold text-xl mb-2">{club.name}</h2>
            <p className="text-gray-600 mb-4">{club.description}</p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>⏰ 운동 시간: {club.meetingTime}</p>
              <p>👥 최대 인원: {club.maxMembers}명</p>
              <p>📍 장소: {club.location}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default withAuth(ClubsPage);

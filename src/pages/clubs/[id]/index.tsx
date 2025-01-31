import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Club } from '@prisma/client';
import { withAuth } from '@/lib/withAuth';
import { User } from '@/types';

interface ClubDetailPageProps {
  user: User;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function ClubDetailPage({ user }: ClubDetailPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const [club, setClub] = useState<Club | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(user ? 1 : 0);

  useEffect(() => {
    if (id) {
      fetch(`/api/clubs/${id}`)
        .then((res) => res.json())
        .then((data) => setClub(data));
    }
  }, [id]);

  const handleJoinClub = async () => {
    try {
      const response = await fetch(`/api/clubs/${id}/join`, {
        method: 'POST',
      });
      if (response.ok) {
        router.reload();
      }
    } catch (error) {
      console.error('Failed to join club:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{club?.name}</h1>
        {!user && (
          <button
            onClick={handleJoinClub}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            모임 가입하기
          </button>
        )}
      </div>

      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow text-blue-700'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            홈
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow text-blue-700'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            오늘 운동 가니?
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-2">
          <Tab.Panel className="rounded-xl bg-white p-3">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold">운영 시간</h3>
                <p>{club?.meetingTime}</p>
              </div>
              <div>
                <h3 className="font-bold">장소</h3>
                <p>{club?.location}</p>
              </div>
              <div>
                <h3 className="font-bold">설명</h3>
                <p>{club?.description}</p>
              </div>
            </div>
          </Tab.Panel>
          <Tab.Panel className="rounded-xl bg-white p-3">
            {user ? (
              <div>오늘 운동 참여 현황</div>
            ) : (
              <div className="text-center py-10">
                <p>회원가입 후 이용 가능합니다</p>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg"
                >
                  회원가입하기
                </button>
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

export default withAuth(ClubDetailPage);

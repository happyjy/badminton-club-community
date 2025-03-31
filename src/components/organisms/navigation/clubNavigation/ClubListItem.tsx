import { useRouter } from 'next/router';

import { Club } from '@/types';

interface ClubListItemProps {
  club: Club;
}

export function ClubListItem({ club }: ClubListItemProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/clubs/${club.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="flex justify-between items-center p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white w-full cursor-pointer"
    >
      <h2 className="font-semibold text-lg">{club.name}</h2>
      <div className="flex items-center text-gray-600">
        <span className="inline-flex items-center">
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {/* {club.members?.length}/{club.maxMembers}명 */}
          {club.members?.length}명
        </span>
      </div>
    </div>
  );
}

export function ClubListItem2({ club }: ClubListItemProps) {
  return (
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
  );
}

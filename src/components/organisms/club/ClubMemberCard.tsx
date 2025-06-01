import { useState, useRef, useEffect } from 'react';

import { ClubResponse } from '@/types/club.types';
import { Status } from '@/types/enums';

interface ClubMember {
  status: string;
  role: string;
  clubId: number;
  birthDate?: string;
  localTournamentLevel?: string;
  nationalTournamentLevel?: string;
  playingPeriod?: number;
  lessonPeriod?: number;
}

interface ClubMemberCardProps {
  member: ClubMember;
  userId: number;
  userClubs: ClubResponse[];
  onApprove: (userId: number, clubId: number) => void;
  onStatusChange?: (userId: number, clubId: number, newStatus: Status) => void;
}

export function ClubMemberCard({
  member,
  userId,
  userClubs,
  onApprove,
  onStatusChange,
}: ClubMemberCardProps) {
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const club = userClubs.find((c) => c.clubId === member.clubId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    };

    if (isStatusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusMenuOpen]);

  const handleStatusChange = (newStatus: Status) => {
    console.log(`🚨 ~ handleStatusChange ~ newStatus:`, newStatus);
    onStatusChange?.(userId, member.clubId, newStatus);
    setIsStatusMenuOpen(false);
  };

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center">
        <p className="text-sm flex items-center gap-2">
          <span>{club?.club?.name || `클럽 ${member.clubId}`}</span>
          <span>상태:</span>
          {member.status === Status.APPROVED ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                className={`font-semibold text-green-600 hover:text-green-700 focus:outline-none`}
              >
                {member.status}
              </button>
              {isStatusMenuOpen && (
                <>
                  {/* 데스크톱용 드롭다운 */}
                  <div className="hidden md:block absolute z-10 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu">
                      {Object.values(Status).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 모바일용 바텀 시트 */}
                  <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
                    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">상태 변경</h3>
                        <button
                          onClick={() => setIsStatusMenuOpen(false)}
                          className="text-gray-500"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-2">
                        {Object.values(Status).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className="w-full px-4 py-3 text-left text-base bg-gray-50 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                            role="menuitem"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <span
              className={`font-semibold ${
                member.status === Status.PENDING
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {member.status}
            </span>
          )}
        </p>
        {member.status === Status.PENDING && (
          <button
            onClick={() => onApprove(userId, member.clubId)}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            승인하기
          </button>
        )}
      </div>
      <MemberDetails member={member} />
    </div>
  );
}

function MemberDetails({ member }: { member: ClubMember }) {
  const details = [
    {
      label: '생년월일',
      value: member.birthDate
        ? new Date(member.birthDate).toLocaleDateString('ko-KR')
        : '미입력',
    },
    {
      label: '전화번호',
      value: member.phoneNumber || '미입력',
    },
    {
      label: '구대회급수',
      value: member.localTournamentLevel || '미입력',
    },
    {
      label: '전국대회급수',
      value: member.nationalTournamentLevel || '미입력',
    },
    {
      label: '구력',
      value: member.playingPeriod ? `${member.playingPeriod}` : '미입력',
    },
    {
      label: '레슨',
      value: member.lessonPeriod ? `${member.lessonPeriod}` : '미입력',
    },
  ];

  return (
    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
      {details.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1">
          <span className="text-gray-500">{label}:</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

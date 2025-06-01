import { useState, useRef, useEffect } from 'react';

import { ClubResponse } from '@/types/club.types';
import { Status } from '@/types/enums';

import { SelectableButton } from '../../atoms/SelectableButton';
import { OptionBottomSheet } from '../../molecules/OptionBottomSheet';
import { OptionDropdown } from '../../molecules/OptionDropdown';

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

  const statusOptions = Object.values(Status).map((status) => ({
    value: status,
    label: status,
  }));

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center">
        <p className="text-sm flex items-center gap-2">
          <span>{club?.club?.name || `클럽 ${member.clubId}`}</span>
          <span>상태:</span>
          {member.status === Status.APPROVED ? (
            <div className="relative" ref={menuRef}>
              <SelectableButton
                label={member.status}
                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              />
              {isStatusMenuOpen && (
                <>
                  <div className="hidden md:block">
                    <OptionDropdown
                      options={statusOptions}
                      onSelect={handleStatusChange}
                    />
                  </div>
                  <div className="md:hidden">
                    <OptionBottomSheet
                      title="상태 변경"
                      options={statusOptions}
                      onSelect={handleStatusChange}
                      onClose={() => setIsStatusMenuOpen(false)}
                    />
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

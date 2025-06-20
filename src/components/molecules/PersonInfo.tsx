import { ReactNode } from 'react';

import Image from 'next/image';

import GuestAvatar from '@/components/atoms/GuestAvatar';
import { calculateAgeGroup } from '@/utils/age';

type Gender = 'MALE' | 'FEMALE' | string;

// 성별에 따른 표시 텍스트 매핑
const GENDER_DISPLAY: Record<string, string> = {
  MALE: '남성',
  FEMALE: '여성',
};

interface PersonInfoProps {
  // 기본 인적 정보
  name: string;
  initial?: string;
  gender?: Gender | null;
  birthDate?: string | null;
  guestRequestName?: string | null;
  intendToJoin?: boolean | null;
  // 아바타/이미지 관련
  thumbnailImageUrl?: string | null;
  guestId?: string;
  // 급수 정보
  nationalTournamentLevel?: string | null;
  localTournamentLevel?: string | null;
  // 추가 콘텐츠
  extraIcons?: ReactNode;
  // 레이아웃/스타일 관련
  className?: string;
  avatarClassName?: string;
  contentClassName?: string;
  badgeContainerClassName?: string;
}

/**
 * 게스트나 회원 등 인물 정보를 표시하는 공통 컴포넌트
 */
function PersonInfo({
  // 기본 인적 정보
  name,
  initial,
  gender,
  birthDate,
  guestRequestName,
  intendToJoin,
  // 아바타/이미지 관련
  thumbnailImageUrl,
  guestId,
  // 급수 정보
  nationalTournamentLevel,
  localTournamentLevel,
  // 추가 콘텐츠
  extraIcons,
  // 레이아웃/스타일 관련
  className = '',
  avatarClassName = '',
  contentClassName = '',
  badgeContainerClassName = 'flex flex-wrap gap-1 mt-1',
}: PersonInfoProps) {
  // 실제 사용할 이니셜 계산
  const displayInitial = initial || name.charAt(0);
  // 성별 표시 텍스트 결정
  const displayGender = gender ? GENDER_DISPLAY[gender] || gender : null;

  // 급수 배지 텍스트 생성 함수
  const renderTournamentLevelBadge = () => {
    // 둘 다 있는 경우
    if (nationalTournamentLevel && localTournamentLevel) {
      // 지역 전국 대회 모두 표시
      return `전국${nationalTournamentLevel}/지역${localTournamentLevel}`;
    }

    // 전국대회만 있는 경우
    if (nationalTournamentLevel) {
      return `전국 ${nationalTournamentLevel}`;
    }

    // 지역대회만 있는 경우
    return `지역 ${localTournamentLevel}`;
  };

  // 급수 배지 타이틀 텍스트 생성 함수
  const getTournamentLevelTitle = () => {
    const parts = [];

    if (nationalTournamentLevel) {
      parts.push(`전국대회: ${nationalTournamentLevel}조`);
    }

    if (localTournamentLevel) {
      parts.push(`지역대회: ${localTournamentLevel}조`);
    }

    return parts.join(' / ');
  };

  // 아바타 렌더링 함수
  const renderAvatar = () => {
    if (guestId) {
      return (
        <GuestAvatar id={guestId} className={avatarClassName} name={name} />
      );
    }

    if (thumbnailImageUrl) {
      return (
        <Image
          src={thumbnailImageUrl}
          alt={name}
          width={40}
          height={40}
          className={`w-10 h-10 rounded-full flex-shrink-0 ${avatarClassName}`}
        />
      );
    }

    return (
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 ${avatarClassName}`}
      >
        {displayInitial}
      </div>
    );
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* 프로필 이미지 또는 아바타 */}
      {renderAvatar()}

      {/* 사용자 정보 */}
      <div className={`flex-1 ${contentClassName}`}>
        <span className="font-medium block truncate">{name}</span>

        <div className={badgeContainerClassName}>
          {intendToJoin && (
            <span className="inline-block bg-green-100 rounded-full px-2 py-0.5 text-xs text-green-800 font-semibold">
              가입희망
            </span>
          )}
          {gender && (
            <span className="inline-block bg-blue-100 rounded-full px-2 py-0.5 text-xs text-gray-600">
              {displayGender}
            </span>
          )}
          {birthDate && (
            <span className="inline-block bg-blue-100 rounded-full px-2 py-0.5 text-xs text-gray-600">
              {calculateAgeGroup(birthDate)}
            </span>
          )}
          {(nationalTournamentLevel || localTournamentLevel) && (
            <span
              className="inline-block bg-blue-100 rounded-full px-2 py-0.5 text-xs text-gray-600 cursor-help"
              title={getTournamentLevelTitle()}
            >
              {renderTournamentLevelBadge()}
            </span>
          )}
        </div>
        {guestRequestName && (
          <p className="text-sm text-gray-500 mt-1 text-right">
            신청자: {guestRequestName}
          </p>
        )}
      </div>

      {/* 추가 아이콘 영역 */}
      {extraIcons}
    </div>
  );
}

export default PersonInfo;

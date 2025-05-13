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
  // 아바타/이미지 관련
  thumbnailImageUrl?: string | null;
  guestId?: string;
  userNickname?: string;
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
  // 아바타/이미지 관련
  thumbnailImageUrl,
  guestId,
  userNickname,
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
      // 알파벳 순서 비교
      // localTournamentLevel.localeCompare(nationalTournamentLevel) < 0 의미: localTournamentLevel 이 더 작으면 지역대회가 더 높은 것이므로 지역대회를 표시
      /* 
        'A'.localeCompare('C'):  -1
        'C'.localeCompare('C'):  0
        'C'.localeCompare('A'):  1
      */
      // 지역, 전국대회 급수가 같은면? 전국 대회 급수를 표시
      if (localTournamentLevel.localeCompare(nationalTournamentLevel) < 0) {
        return `지역 ${localTournamentLevel}`;
      } else {
        return `전국 ${nationalTournamentLevel}`;
      }
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
        <GuestAvatar
          id={guestId}
          name={name}
          userNickname={userNickname}
          className={avatarClassName}
        />
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
      <div className={`${contentClassName}`}>
        <span className="font-medium block truncate">{name}</span>

        <div className={badgeContainerClassName}>
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
              {renderTournamentLevelBadge()}조
            </span>
          )}
        </div>
      </div>

      {/* 추가 아이콘 영역 */}
      {extraIcons}
    </div>
  );
}

export default PersonInfo;

import { ReactNode } from 'react';

import { Avatar } from '@/components/atoms/Avatar';
import { StatusChip } from '@/components/atoms/StatusChip';

import { cn } from '@/lib/utils';
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
  /** 이름 앞에 표시할 순번 (예: 1, 2, 3) */
  number?: number;
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
  /** 배지 오른쪽에 추가로 표시할 메타 정보 (예: 참여 시간) */
  rightMeta?: ReactNode;
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
  number: numberProp,
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
  rightMeta,
  // 레이아웃/스타일 관련
  className = '',
  avatarClassName = '',
  contentClassName = '',
  badgeContainerClassName = 'mt-0.5 flex items-center gap-1',
}: PersonInfoProps) {
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
  const renderAvatar = () => (
    <Avatar
      name={name}
      src={thumbnailImageUrl}
      // 게스트는 이름이 같아도 색이 달라지도록 id로 색을 고른다.
      seed={guestId}
      className={cn('h-10 w-10 text-callout', avatarClassName)}
    />
  );

  // 이름 아래 한 줄 설명: 성별 · 나이대 · 급수
  const hasLevel = !!(nationalTournamentLevel || localTournamentLevel);
  const meta = [
    displayGender,
    birthDate ? calculateAgeGroup(birthDate) : null,
    hasLevel ? renderTournamentLevelBadge() : null,
  ].filter(Boolean);

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {/* 프로필 이미지 또는 아바타 */}
      {renderAvatar()}

      {/* 사용자 정보 */}
      <div className={cn('min-w-0', contentClassName)}>
        <div className="flex items-center gap-1.5">
          <span className="block min-w-0 truncate text-headline text-primary">
            {numberProp != null && (
              <span className="font-medium text-secondary">{numberProp}.</span>
            )}{' '}
            {name}
          </span>
          {intendToJoin && <StatusChip tone="positive">가입희망</StatusChip>}
          {/* 추가 아이콘 영역 */}
          {extraIcons}
        </div>

        {(meta.length > 0 || rightMeta) && (
          <div className={badgeContainerClassName}>
            {meta.length > 0 && (
              <span
                data-person-meta
                className="text-footnote text-secondary"
                title={hasLevel ? getTournamentLevelTitle() : undefined}
              >
                {meta.join(' · ')}
              </span>
            )}
            {rightMeta && <div className="ml-auto">{rightMeta}</div>}
          </div>
        )}
        {guestRequestName && (
          <p className="mt-0.5 text-footnote text-secondary">
            신청자: {guestRequestName}
          </p>
        )}
      </div>
    </div>
  );
}

export default PersonInfo;

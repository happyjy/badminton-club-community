import { Guest } from '@/types';

interface GuestAvatarProps {
  id: string;
  name?: string;
  userNickname?: string;
  className?: string;
  guest?: Guest; // 기존 코드 호환성을 위해 남겨둠
}

function GuestAvatar({
  id,
  name,
  userNickname,
  className = '',
  guest,
}: GuestAvatarProps) {
  // 하위 호환성을 위해 guest 객체에서 값 추출
  const guestId = id || (guest?.id ?? '');
  const guestName = name || (guest?.name ?? '');
  const guestNickname = userNickname || (guest?.user?.nickname ?? '');

  // 게스트의 이니셜 가져오기
  const getInitials = (displayName: string, fallbackName: string) => {
    // 빈 문자열 체크를 간소화
    if (!displayName && !fallbackName) return 'G';
    return (displayName || fallbackName).charAt(0).toUpperCase();
  };

  // 고유한 배경색 생성 (게스트 ID 기반)
  const getBgColor = (guestId: string) => {
    const colors = [
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-blue-500',
      'bg-teal-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-orange-500',
    ];

    // ID가 비어있는 경우 기본 색상 제공
    if (!guestId) return colors[0];

    // ID의 각 문자 코드 합계로 색상 결정
    const sum = guestId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  // CSS 클래스 구성
  const avatarClass = `w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getBgColor(guestId)} ${className}`;

  return (
    <div className={avatarClass}>{getInitials(guestName, guestNickname)}</div>
  );
}

export default GuestAvatar;

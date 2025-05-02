import { Guest } from '@/types';

interface GuestAvatarProps {
  guest: Guest;
}

function GuestAvatar({ guest }: GuestAvatarProps) {
  // 게스트의 이니셜 가져오기
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'G';
  };

  // 고유한 배경색 생성 (게스트 ID 기반)
  const getBgColor = (id: string) => {
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

    // ID의 각 문자 코드 합계로 색상 결정
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getBgColor(guest.id)}`}
    >
      {getInitials(guest.name || guest.user.nickname)}
    </div>
  );
}

export default GuestAvatar;

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';
import Image from 'next/image';
import { Workout } from '@/types';
import { formatToKoreanTime } from '@/utils';
import badmintonNetIcon from '@/icon/badmintonNet.svg';
import badmintonShuttleCockIcon from '@/icon/badmintonShuttleCock.svg';
import broomStickIcon from '@/icon/broomStick.svg';

// 선택된 아이콘 타입 정의
type SelectedIcon = 'net' | 'broomStick' | 'shuttlecock';
type ParticipantIcons = Record<string, SelectedIcon[]>;

// CircleMenu 컴포넌트 수정
const CircleMenu = ({
  isOpen,
  onClose,
  onIconSelect,
  selectedIcons,
}: {
  isOpen: boolean;
  onClose: () => void;
  onIconSelect: (icon: SelectedIcon) => void;
  selectedIcons: SelectedIcon[];
}) => {
  const handleIconClick = (icon: SelectedIcon) => {
    onIconSelect(icon);
    onClose();
  };

  return (
    <div className="relative">
      <div
        className={`fixed inset-0 ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      <div className="absolute -top-2 -right-2">
        <div className="relative">
          <div
            className={`absolute transform transition-all duration-300 ease-in-out
              ${isOpen ? '-translate-y-14' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('net')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('net')}
            >
              <Image
                src={badmintonNetIcon}
                alt="badminton net"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out
              ${isOpen ? '-translate-y-2 -translate-x-8' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('broomStick')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('broomStick')}
            >
              <Image
                src={broomStickIcon}
                alt="broom stick"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out
              ${isOpen ? '-translate-y-2 translate-x-8' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('shuttlecock')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('shuttlecock')}
            >
              <Image
                src={badmintonShuttleCockIcon}
                alt="shuttlecock"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function WorkoutDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(
    null
  );
  const [participantIcons, setParticipantIcons] = useState<ParticipantIcons>(
    () => ({})
  );

  useEffect(() => {
    if (!id) return;

    const fetchWorkoutDetail = async () => {
      try {
        const response = await fetch(`/api/workouts/${id}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        setWorkout(result.data.workout);
        // 성공 메시지 처리 가능
        // console.log(result.message);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '운동 정보를 불러오는데 실패했습니다'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkoutDetail();
  }, [id]);

  const handleIconSelect = (userId: number, icon: SelectedIcon) => {
    setParticipantIcons((prev) => {
      const currentIcons = prev[userId] || [];
      let newIcons: SelectedIcon[];

      if (currentIcons.includes(icon)) {
        // 이미 선택된 아이콘이면 제거
        newIcons = currentIcons.filter((i) => i !== icon);
      } else {
        // 새로운 아이콘 추가 (최대 3개까지)
        newIcons = [...currentIcons, icon].slice(-3);
      }

      return {
        ...prev,
        [userId]: newIcons,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg">
          {error || '운동 정보를 찾을 수 없습니다'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">{workout.title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">📅</span>
            <span>{new Date(workout.date).toLocaleDateString('ko-KR')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">⏰</span>
            <span>
              {formatToKoreanTime(workout.startTime)} -{' '}
              {formatToKoreanTime(workout.endTime)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">👥</span>
            <span>{workout.WorkoutParticipant.length}명</span>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">참여자 목록</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workout.WorkoutParticipant.map((participant) => (
              <div
                key={participant.User.id}
                className="relative flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  console.log({
                    selectedParticipant,
                    'participant.User.id': participant.User.id,
                  });

                  setSelectedParticipant(
                    selectedParticipant === participant.User.id
                      ? null
                      : participant.User.id
                  );
                }}
              >
                {participant.User.thumbnailImageUrl && (
                  <Image
                    src={participant.User.thumbnailImageUrl}
                    alt={participant.User.nickname}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <span className="font-medium">{participant.User.nickname}</span>
                <div className="flex space-x-1 ml-2">
                  {(participantIcons[participant.User.id] ?? []).map(
                    (iconType, index) => (
                      <Image
                        key={index}
                        src={
                          iconType === 'net'
                            ? badmintonNetIcon
                            : iconType === 'broomStick'
                              ? broomStickIcon
                              : badmintonShuttleCockIcon
                        }
                        alt="status icon"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    )
                  )}
                </div>
                <CircleMenu
                  isOpen={selectedParticipant === participant.User.id}
                  onClose={() => setSelectedParticipant(null)}
                  onIconSelect={(icon) =>
                    handleIconSelect(participant.User.id, icon)
                  }
                  selectedIcons={participantIcons[participant.User.id] || []}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(WorkoutDetailPage);

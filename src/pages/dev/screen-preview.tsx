import { useState } from 'react';

import { useRouter } from 'next/router';

import { Button } from '@/components/atoms/buttons/Button';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { BoardToolbar } from '@/components/organisms/board/BoardToolbar';
import PostList from '@/components/organisms/board/PostList';
import {
  GuestApplicationItem,
  GuestApplicationList,
} from '@/components/organisms/guest/GuestApplicationList';
import { GuestApplicationModal } from '@/components/organisms/modal/join';
import { PageHeader } from '@/components/organisms/PageHeader';
import { SelectedIcon } from '@/components/organisms/workout/HelperSheet';
import { WorkoutCard } from '@/components/organisms/workout/WorkoutCard';
import { WorkoutDetailView } from '@/components/organisms/workout/WorkoutDetailView';
import { AppShell } from '@/components/templates/AppShell';

import { HELPER_LIMIT } from '@/hooks/useHelperIcons';

import { getNavItems } from '@/constants/navItems';
import { Guest, User, Workout, WorkoutParticipant } from '@/types';
import { PostWithRelations } from '@/types/board.types';
import { SortOption } from '@/types/participantSort';

import type { GetServerSideProps } from 'next';

// 개발 서버에서만 연다. 운영에서는 404.
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

type Screen = 'attendance' | 'workout' | 'guest' | 'board';

const ME = { id: 7, nickname: '나' } as User;
const NAMES = [
  '김민수',
  '이지은',
  '박준호',
  '최서연',
  '정우진',
  '한소희',
  '오지훈',
  '윤하늘',
];

const person = (userId: number, name: string): WorkoutParticipant =>
  ({
    id: userId,
    workoutId: 1,
    userId,
    status: 'CONFIRMED',
    User: { id: userId, nickname: name, thumbnailImageUrl: '' },
    clubMember: {
      id: userId * 10,
      name,
      gender: userId % 2 ? 'MALE' : 'FEMALE',
      birthDate: `${1985 + userId}-03-01`,
      localTournamentLevel: ['A', 'B', 'C', 'D'][userId % 4],
    },
  }) as unknown as WorkoutParticipant;

const people = (count: number, includeMe = false) => [
  ...NAMES.slice(0, count).map((name, index) => person(index + 1, name)),
  ...(includeMe ? [person(ME.id, '나')] : []),
];

const day = (date: string, start: string, end: string) => ({
  date: new Date(`${date}T00:00:00.000Z`),
  startTime: new Date(`${date}T${start}:00.000Z`),
  endTime: new Date(`${date}T${end}:00.000Z`),
  createdAt: new Date(`${date}T00:00:00.000Z`),
  updatedAt: new Date(`${date}T00:00:00.000Z`),
});

// 상태를 고루 담은 가짜 운동 목록
const INITIAL_WORKOUTS: Workout[] = [
  {
    id: 1,
    clubId: 1,
    title: '토요 정기 운동',
    description: '셔틀콕은 클럽에서 준비해요.',
    location: '당산초 체육관',
    maxParticipants: 24,
    ...day('2026-10-03', '19:00', '22:00'),
    WorkoutParticipant: people(6, true),
    guestCount: 2,
    parking: {
      enabled: true,
      capacity: 5,
      confirmedCount: 3,
      waitlistCount: 0,
      overrideCapacity: null,
      myStatus: 'CONFIRMED',
      myWaitlistOrder: null,
    },
  },
  {
    id: 2,
    clubId: 1,
    title: '화요 평일 운동',
    description: '',
    location: '당산초 체육관',
    maxParticipants: 24,
    ...day('2026-10-06', '20:00', '22:00'),
    WorkoutParticipant: people(4),
    parking: {
      enabled: true,
      capacity: 3,
      confirmedCount: 3,
      waitlistCount: 2,
      overrideCapacity: null,
      myStatus: 'NONE',
      myWaitlistOrder: null,
    },
  },
  {
    id: 3,
    clubId: 1,
    title: '목요 번개 (정원이 찬 운동)',
    description: '',
    location: '영등포 제2스포츠센터 3층 다목적 체육관',
    maxParticipants: 3,
    ...day('2026-10-08', '20:00', '22:00'),
    WorkoutParticipant: people(3),
  },
  {
    id: 4,
    clubId: 1,
    title:
      '10월 둘째 주 토요 정기 운동 겸 신입 회원 환영 모임 그리고 가을 대회 대비 연습',
    description:
      '설명이 아주 긴 운동이에요. 운동이 끝난 뒤에는 근처 식당에서 신입 회원 환영 모임이 있어요. 참석하실 분은 미리 댓글로 알려 주시고, 주차 공간이 좁으니 가급적 대중교통을 이용해 주세요.',
    location: '당산초 체육관',
    maxParticipants: 24,
    ...day('2026-10-10', '19:00', '22:00'),
    WorkoutParticipant: [],
  },
];

const POSTS = [
  {
    id: 1,
    title: '10월 정기 총회 안내',
    content:
      '10월 18일 운동이 끝난 뒤 체육관에서 정기 총회를 엽니다. 회비 결산과 내년 임원 선출이 있으니 꼭 참석해 주세요.',
    isPinned: true,
    viewCount: 128,
    likeCount: 12,
    createdAt: '2026-10-01T03:00:00.000Z',
    category: { id: 1, name: '공지사항' },
    author: { name: '김민수' },
    _count: { comments: 7 },
  },
  {
    id: 2,
    title:
      '요넥스 아스트록스 88D 프로 팝니다 (4U, 사용 3개월, 거트 새로 맸어요)',
    content: '직거래 원합니다.',
    isPinned: false,
    viewCount: 45,
    likeCount: 1,
    createdAt: '2026-09-28T03:00:00.000Z',
    category: { id: 2, name: '중고장터' },
    author: { name: '이지은' },
    _count: { comments: 2 },
  },
  {
    id: 3,
    title: '지난주 운동 사진',
    content: 'https://example.com/photos 에 올려 두었어요.',
    isPinned: false,
    viewCount: 9,
    likeCount: 0,
    createdAt: '2025-12-20T03:00:00.000Z',
    category: { id: 3, name: '자유게시판' },
    author: { name: null },
  },
] as unknown as PostWithRelations[];

const GUEST_DESCRIPTION = `◦ 이 클럽에 게스트로 초대 하고 싶은 분이 있으시다면 아래 버튼을 클릭하여 신청서를 작성해주세요.
◦ 게스트 참여 당일 참여 인원수가 많으면 제한 될 수 있습니다.
◦ 방문 신청은 최소 이틀 전에 하시기 바랍니다.`;

const GUEST_APPLICATIONS: GuestApplicationItem[] = [
  {
    id: 'a',
    name: '신유빈',
    status: 'PENDING',
    visitDate: '2026-10-10',
    createdAt: '2026-10-02T03:00:00.000Z',
    intendToJoin: true,
  },
  {
    id: 'b',
    name: 'test',
    status: 'REJECTED',
    visitDate: '2026-09-13',
    createdAt: '2026-09-12T03:00:00.000Z',
    intendToJoin: false,
  },
  {
    id: 'c',
    name: '류승환',
    status: 'APPROVED',
    visitDate: '2026-07-09',
    createdAt: '2026-07-09T03:00:00.000Z',
    intendToJoin: true,
  },
  {
    id: 'd',
    name: '조윤미(코치님게스트)',
    status: 'APPROVED',
    visitDate: '2026-07-02',
    createdAt: '2026-07-02T03:00:00.000Z',
    intendToJoin: false,
  },
  {
    id: 'e',
    name: '아주아주 긴 이름을 가진 게스트(외부 클럽 소속 코치님 초대)',
    status: 'APPROVED',
    visitDate: '2025-12-30',
    createdAt: '2025-12-28T03:00:00.000Z',
    intendToJoin: true,
  },
  {
    id: 'f',
    name: '유효한',
    status: 'APPROVED',
    visitDate: '',
    createdAt: '2026-07-06T03:00:00.000Z',
    intendToJoin: false,
  },
];

const GUESTS = [
  {
    id: 'g1',
    name: '홍길동',
    gender: 'MALE',
    birthDate: '1992-01-01',
    localTournamentLevel: 'C',
    intendToJoin: true,
    clubMember: { name: '김민수' },
  },
  { id: 'g2', name: '성춘향', gender: 'FEMALE', intendToJoin: false },
] as unknown as Guest[];

/**
 * 로그인 없이 옮긴 화면(출석체크, 운동 상세)을 가짜 데이터로 보는 화면.
 * 버튼을 누르면 이 화면 안의 가짜 상태만 바뀐다. 서버에는 아무것도 보내지 않는다.
 */
export default function ScreenPreviewPage() {
  const router = useRouter();
  const queryScreen = router.query.screen;
  const screen: Screen =
    queryScreen === 'workout' ||
    queryScreen === 'guest' ||
    queryScreen === 'board'
      ? queryScreen
      : 'attendance';

  const [workouts, setWorkouts] = useState(INITIAL_WORKOUTS);
  const [isAdmin, setIsAdmin] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('createdAt');
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [icons, setIcons] = useState<Record<string, SelectedIcon[]>>({
    '1': ['net', 'key'],
    '3': ['mop'],
  });

  const toggleParticipation = (workoutId: number, isParticipating: boolean) => {
    setWorkouts((prev) =>
      prev.map((workout) => {
        if (workout.id !== workoutId) return workout;
        const others = (workout.WorkoutParticipant ?? []).filter(
          (participant) => participant.userId !== ME.id
        );
        return {
          ...workout,
          WorkoutParticipant: isParticipating
            ? others
            : [...others, person(ME.id, '나')],
        };
      })
    );
  };

  const toggleParking = (workoutId: number, isRequested: boolean) => {
    setWorkouts((prev) =>
      prev.map((workout) => {
        if (workout.id !== workoutId || !workout.parking) return workout;
        const { parking } = workout;
        if (isRequested) {
          return { ...workout, parking: { ...parking, myStatus: 'NONE' } };
        }
        const hasRoom = parking.confirmedCount < parking.capacity;
        return {
          ...workout,
          parking: {
            ...parking,
            myStatus: hasRoom ? 'CONFIRMED' : 'WAITLIST',
            myWaitlistOrder: hasRoom ? null : parking.waitlistCount + 1,
          },
        };
      })
    );
  };

  const detail: Workout = {
    ...workouts[0],
    guests: GUESTS,
    parkingRequests: [
      {
        id: 1,
        clubMemberId: 10,
        name: '김민수',
        status: 'CONFIRMED',
        position: 1,
      },
      {
        id: 2,
        clubMemberId: 20,
        name: '이지은',
        status: 'CONFIRMED',
        position: 2,
      },
      {
        id: 3,
        clubMemberId: 30,
        name: '박준호',
        status: 'WAITLIST',
        position: 3,
      },
    ],
  };
  const participants = [...(detail.WorkoutParticipant ?? [])].sort((a, b) =>
    sortOption === 'name'
      ? (a.clubMember?.name ?? '').localeCompare(b.clubMember?.name ?? '', 'ko')
      : 0
  );

  return (
    <AppShell
      variant="member"
      clubId="1"
      clubName="당산 배드민턴 클럽"
      items={getNavItems({
        clubId: '1',
        isMember: true,
        isAdmin,
        tournamentMenuEnabled: true,
      })}
      currentPath="/clubs/1/attendance"
      isAuthenticated
      onLogin={() => {}}
      onLogout={() => {}}
    >
      <div className="mb-4 space-y-2 rounded-md border border-dashed border-border p-3">
        <p className="text-footnote text-secondary">
          개발용 미리보기 — 가짜 데이터예요. 눌러도 서버에 보내지 않아요.
        </p>
        <SegmentedControl<Screen>
          aria-label="미리 볼 화면"
          options={[
            { value: 'attendance', label: '출석체크' },
            { value: 'workout', label: '운동 상세' },
            { value: 'guest', label: '게스트' },
            { value: 'board', label: '게시판' },
          ]}
          value={screen}
          onChange={(next) =>
            router.replace(`/dev/screen-preview?screen=${next}`)
          }
        />
        <SegmentedControl<'admin' | 'member'>
          aria-label="보는 사람"
          options={[
            { value: 'admin', label: '운영진으로 보기' },
            { value: 'member', label: '회원으로 보기' },
          ]}
          value={isAdmin ? 'admin' : 'member'}
          onChange={(next) => setIsAdmin(next === 'admin')}
        />
      </div>

      {screen === 'attendance' ? (
        <>
          <PageHeader title="출석체크" />
          <div className="grid gap-4 md:grid-cols-2">
            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                user={ME}
                isLoggedIn
                membershipStatus={{ isMember: true, isPending: false }}
                isAdmin={isAdmin}
                onParticipate={toggleParticipation}
                onParkingRequest={toggleParking}
                onEdit={() => {}}
                onDelete={() => {}}
                detailHref="/dev/screen-preview?screen=workout"
              />
            ))}
          </div>
        </>
      ) : screen === 'board' ? (
        <div className="space-y-4">
          <PageHeader title="게시판" className="mb-0" />
          <BoardToolbar
            sort="latest"
            onChangeSort={() => {}}
            canWrite
            canManageCategories={isAdmin}
            onClickWrite={() => {}}
            onClickManageCategories={() => {}}
          />
          <PostList posts={POSTS} />
        </div>
      ) : screen === 'guest' ? (
        <>
          <PageHeader title="게스트 신청" />
          <div className="space-y-6">
            <div className="space-y-4 rounded-md bg-surface p-4">
              <p className="whitespace-pre-wrap break-words text-body text-secondary">
                {GUEST_DESCRIPTION}
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => setIsGuestModalOpen(true)}
              >
                게스트 신청하기
              </Button>
            </div>
            <GuestApplicationList
              label="내 게스트 신청 내역"
              applications={GUEST_APPLICATIONS}
              hrefFor={() => '/dev/screen-preview?screen=guest'}
            />
          </div>
          <GuestApplicationModal
            user={ME}
            clubId="1"
            isOpen={isGuestModalOpen}
            onClose={() => setIsGuestModalOpen(false)}
            onSubmit={() => setIsGuestModalOpen(false)}
            // 가짜 인증: 번호를 넣고 '인증하기'를 누르면 입력칸이 열린다.
            sendPhoneVerificationCode={async () => ({})}
            verifyPhoneCode={async () => ({})}
            checkPhoneVerificationStatus={async () => {}}
          />
        </>
      ) : (
        <WorkoutDetailView
          workout={detail}
          backHref="/dev/screen-preview?screen=attendance"
          participants={participants}
          sortOption={sortOption}
          onChangeSort={setSortOption}
          participantIcons={icons}
          getAttendanceCount={(id) => (id ? (id / 10) * 3 : 0)}
          getHelperCount={(id) => (id && id % 20 === 0 ? id / 20 : 0)}
          isAdmin={isAdmin}
          onToggleHelper={(userId, _clubMemberId, icon) => {
            const current = icons[userId] ?? [];
            if (!current.includes(icon) && current.length >= HELPER_LIMIT) {
              setHelperMessage(
                `도움은 한 사람에 ${HELPER_LIMIT}개까지 기록할 수 있어요.`
              );
              return;
            }
            setHelperMessage(null);
            setIcons({
              ...icons,
              [userId]: current.includes(icon)
                ? current.filter((value) => value !== icon)
                : [...current, icon],
            });
          }}
          helperMessage={helperMessage}
          onCloseHelper={() => setHelperMessage(null)}
          onParkingCapacityChange={async () => {}}
        />
      )}
    </AppShell>
  );
}

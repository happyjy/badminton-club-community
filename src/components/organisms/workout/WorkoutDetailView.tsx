import { ReactNode, useState } from 'react';

import { Clock, type LucideIcon, MapPin, Users } from 'lucide-react';

import { Select } from '@/components/atoms/inputs/Select';
import { StatusChip } from '@/components/atoms/StatusChip';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import PersonInfo from '@/components/molecules/PersonInfo';
import { PageHeader } from '@/components/organisms/PageHeader';
import {
  HelperIcons,
  HelperSheet,
  SelectedIcon,
} from '@/components/organisms/workout/HelperSheet';
import { WorkoutParkingSection } from '@/components/organisms/workout/WorkoutParkingSection';

import { formatWorkoutDateLabel } from '@/lib/workout/datetime';
import { Guest, Workout, WorkoutParticipant } from '@/types';
import { SortOption } from '@/types/participantSort';
import { formatToKoreanTime } from '@/utils/date';

interface WorkoutDetailViewProps {
  workout: Workout;
  /** 출석체크로 돌아가는 주소 */
  backHref: string;
  /** 정렬이 끝난 참여자 */
  participants: WorkoutParticipant[];
  sortOption: SortOption;
  onChangeSort: (option: SortOption) => void;
  /** userId → 그 사람이 한 도움 */
  participantIcons: Record<string, SelectedIcon[]>;
  getAttendanceCount: (clubMemberId: number | undefined) => number;
  getHelperCount: (clubMemberId: number | undefined) => number;
  isAdmin: boolean;
  onToggleHelper: (
    userId: number,
    clubMemberId: number | undefined,
    icon: SelectedIcon
  ) => void;
  onParkingCapacityChange: (capacity: number | null) => Promise<void>;
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 px-4 py-3 text-body text-primary">
      <Icon aria-hidden className="h-5 w-5 shrink-0 text-secondary" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/**
 * 운동 상세의 그리는 부분. 데이터는 페이지가 읽어서 넘긴다.
 * 참여자를 누르면 그 사람의 도움 기록 시트가 열린다.
 */
export function WorkoutDetailView({
  workout,
  backHref,
  participants,
  sortOption,
  onChangeSort,
  participantIcons,
  getAttendanceCount,
  getHelperCount,
  isAdmin,
  onToggleHelper,
  onParkingCapacityChange,
}: WorkoutDetailViewProps) {
  // 도움 기록 시트를 연 참여자의 userId
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const guests = workout.guests ?? [];
  const participantCount = workout.WorkoutParticipant?.length || 0;
  const displayName = (participant: WorkoutParticipant) =>
    participant.clubMember?.name || participant.User.nickname;

  const selected = participants.find(
    (participant) => participant.User.id === selectedUserId
  );

  return (
    <>
      <PageHeader
        title={workout.title}
        subtitle={formatWorkoutDateLabel(workout.date)}
        backHref={backHref}
      />

      <div className="space-y-6">
        <ListGroup label="일정">
          <InfoRow icon={Clock}>
            {formatToKoreanTime(workout.startTime)} –{' '}
            {formatToKoreanTime(workout.endTime)}
          </InfoRow>
          <InfoRow icon={MapPin}>{workout.location}</InfoRow>
          <InfoRow icon={Users}>
            {participantCount}명
            {guests.length > 0 && ` + 게스트 ${guests.length}명`}
          </InfoRow>
        </ListGroup>

        {guests.length > 0 && (
          <ListGroup label={`방문 게스트 ${guests.length}명`}>
            {guests.map((guest: Guest, index) => (
              <div key={guest.id} className="px-4 py-3">
                <PersonInfo
                  number={index + 1}
                  name={guest.name}
                  gender={guest.gender}
                  birthDate={guest.birthDate}
                  guestId={guest.id}
                  nationalTournamentLevel={guest.nationalTournamentLevel}
                  localTournamentLevel={guest.localTournamentLevel}
                  guestRequestName={guest.clubMember?.name || '본인작성'}
                  intendToJoin={guest.intendToJoin}
                />
              </div>
            ))}
          </ListGroup>
        )}

        <section>
          <div className="flex items-end justify-between gap-3 px-4 pb-2">
            <h2 className="text-footnote text-secondary">
              참여자 {participantCount}명
            </h2>
            <Select
              placeholder={null}
              fullWidth={false}
              aria-label="정렬"
              value={sortOption}
              onChange={(e) => onChangeSort(e.target.value as SortOption)}
            >
              <option value="createdAt">참여순서</option>
              <option value="name">이름순</option>
              <option value="gender">성별</option>
              <option value="localLevel">지역대회 급수</option>
              <option value="nationalLevel">전국대회 급수</option>
            </Select>
          </div>

          {participants.length === 0 ? (
            <div className="rounded-md bg-surface">
              <EmptyState icon={Users} title="아직 참여자가 없어요" />
            </div>
          ) : (
            <div className="divide-y-[0.5px] divide-separator overflow-hidden rounded-md bg-surface">
              {participants.map((participant, index) => {
                // 클럽 회원 정보가 없는 참여자는 그리지 않는다. 번호는 전체 순서를 따른다.
                if (!participant.clubMember) return null;

                const clubMemberId = participant.clubMember.id;
                const attendanceCount = getAttendanceCount(clubMemberId);
                const helperCount = getHelperCount(clubMemberId);

                return (
                  <button
                    key={participant.User.id}
                    type="button"
                    onClick={() => setSelectedUserId(participant.User.id)}
                    className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 active:bg-fill"
                  >
                    <PersonInfo
                      className="flex-1"
                      number={index + 1}
                      name={displayName(participant)}
                      gender={participant.clubMember.gender}
                      birthDate={participant.clubMember.birthDate}
                      thumbnailImageUrl={participant.User.thumbnailImageUrl}
                      nationalTournamentLevel={
                        participant.clubMember.nationalTournamentLevel
                      }
                      localTournamentLevel={
                        participant.clubMember.localTournamentLevel
                      }
                      extraIcons={
                        <HelperIcons
                          icons={participantIcons[participant.User.id] ?? []}
                        />
                      }
                    />
                    {(attendanceCount > 0 || helperCount > 0) && (
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {attendanceCount > 0 && (
                          <StatusChip tone="neutral">
                            출석 {attendanceCount}
                          </StatusChip>
                        )}
                        {helperCount > 0 && (
                          <StatusChip tone="neutral">
                            도움 {helperCount}
                          </StatusChip>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 주차 명단 및 관리자용 대수 변경 */}
        {workout.parking?.enabled && (
          <WorkoutParkingSection
            capacity={workout.parking.capacity}
            overrideCapacity={workout.parking.overrideCapacity}
            requests={workout.parkingRequests ?? []}
            isAdmin={isAdmin}
            onCapacityChange={onParkingCapacityChange}
          />
        )}
      </div>

      <HelperSheet
        open={!!selected}
        onClose={() => setSelectedUserId(null)}
        name={selected ? displayName(selected) : ''}
        selected={selected ? (participantIcons[selected.User.id] ?? []) : []}
        onToggle={(icon) => {
          if (!selected) return;
          onToggleHelper(selected.User.id, selected.clubMember?.id, icon);
        }}
      />
    </>
  );
}

export default WorkoutDetailView;

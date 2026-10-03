import { ReactNode, useState } from 'react';

import Link from 'next/link';

import {
  Car,
  Clock,
  type LucideIcon,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';

import { Button } from '@/components/atoms/buttons/Button';
import { IconButton } from '@/components/atoms/buttons/IconButton';
import { StatusChip } from '@/components/atoms/StatusChip';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { formatWorkoutDateLabel } from '@/lib/workout/datetime';
import { WorkoutListItemProps } from '@/types';
import { formatToKoreanTime } from '@/utils/date';

interface WorkoutCardProps extends WorkoutListItemProps {
  /** 운동 상세로 가는 주소 */
  detailHref: string;
}

function Meta({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-footnote text-secondary">
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </p>
  );
}

/**
 * 출석체크 화면의 운동 카드. 윗부분을 누르면 상세로 가고,
 * 아래 버튼으로 참여·주차를 바로 신청한다.
 */
export function WorkoutCard({
  workout,
  user,
  isLoggedIn,
  onParticipate,
  membershipStatus,
  isAdmin = false,
  onEdit,
  onDelete,
  onParkingRequest,
  isParticipatePending = false,
  isParkingPending = false,
  detailHref,
}: WorkoutCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isParticipating =
    workout.WorkoutParticipant?.some(
      (participant) => participant.userId === user?.id
    ) || false;
  const currentParticipants = workout.WorkoutParticipant?.length || 0;
  const guestCount = workout.guestCount || 0;
  const isFull = currentParticipants >= workout.maxParticipants;
  // 주차가 꺼진 클럽이면 주차 영역을 그리지 않는다.
  const parking = workout.parking?.enabled ? workout.parking : null;

  const parkingLabel = () => {
    if (!parking) return '';
    if (!isParticipating) return '주차 · 운동 참여 후 신청 가능';
    if (parking.myStatus === 'CONFIRMED') return '주차 확정 · 취소하기';
    if (parking.myStatus === 'WAITLIST') {
      return `주차 대기 ${parking.myWaitlistOrder ?? ''}번 · 취소하기`;
    }
    return parking.confirmedCount >= parking.capacity
      ? '주차 대기 신청'
      : '주차 신청';
  };

  return (
    <article className="overflow-hidden rounded-md bg-surface">
      <div className="flex items-start">
        <Link
          href={detailHref}
          className="min-w-0 flex-1 px-4 pb-3 pt-4 transition-colors duration-150 active:bg-fill"
        >
          <div className="flex items-center gap-2">
            <h2 className="truncate text-headline text-primary">
              {formatWorkoutDateLabel(workout.date)}
            </h2>
            {isParticipating ? (
              <StatusChip tone="positive">참석</StatusChip>
            ) : (
              isFull && <StatusChip tone="neutral">마감</StatusChip>
            )}
          </div>
          <p className="mt-0.5 truncate text-callout text-primary">
            {workout.title}
          </p>
          {workout.description && (
            <p className="mt-0.5 line-clamp-2 text-footnote text-secondary">
              {workout.description}
            </p>
          )}

          <div className="mt-3 space-y-1">
            <Meta icon={Clock}>
              {formatToKoreanTime(workout.startTime)} –{' '}
              {formatToKoreanTime(workout.endTime)}
            </Meta>
            <Meta icon={MapPin}>{workout.location}</Meta>
            <Meta icon={Users}>
              {currentParticipants}명
              {guestCount > 0 && ` + 게스트 ${guestCount}명`}
            </Meta>
            {parking && (
              <Meta icon={Car}>
                주차 {parking.confirmedCount}/{parking.capacity}
                {parking.waitlistCount > 0 &&
                  ` (대기 ${parking.waitlistCount}명)`}
              </Meta>
            )}
          </div>
        </Link>

        {isAdmin && (
          <IconButton
            aria-label="운동 일정 관리"
            onClick={() => setIsMenuOpen(true)}
            className="mr-1 mt-1.5 text-secondary"
          >
            <MoreHorizontal aria-hidden className="h-5 w-5" />
          </IconButton>
        )}
      </div>

      {isLoggedIn && (
        <div className="space-y-2 border-t-[0.5px] border-separator px-4 py-3">
          {membershipStatus.isMember ? (
            <>
              <Button
                type="button"
                variant={isParticipating ? 'secondary' : 'primary'}
                className="w-full"
                pending={isParticipatePending}
                disabled={!isParticipating && isFull}
                onClick={() => onParticipate(workout.id, isParticipating)}
              >
                {isParticipating
                  ? '참여 취소'
                  : isFull
                    ? '인원 마감'
                    : '참여하기'}
              </Button>
              {parking && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  pending={isParkingPending}
                  disabled={!isParticipating}
                  onClick={() =>
                    onParkingRequest?.(workout.id, parking.myStatus !== 'NONE')
                  }
                >
                  {parkingLabel()}
                </Button>
              )}
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled
            >
              {membershipStatus.isPending ? '승인 대기중' : '클럽 가입 필요'}
            </Button>
          )}
        </div>
      )}

      {isAdmin && (
        <Sheet
          open={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          title="운동 일정 관리"
        >
          <ListGroup tone="inset">
            <ListRow
              leading={
                <Pencil aria-hidden className="h-5 w-5 text-secondary" />
              }
              title="수정"
              onClick={() => {
                setIsMenuOpen(false);
                onEdit?.(workout);
              }}
            />
            <ListRow
              leading={<Trash2 aria-hidden className="h-5 w-5 text-negative" />}
              title={<span className="text-negative">삭제</span>}
              onClick={() => {
                setIsMenuOpen(false);
                onDelete?.(workout);
              }}
            />
          </ListGroup>
        </Sheet>
      )}
    </article>
  );
}

export default WorkoutCard;

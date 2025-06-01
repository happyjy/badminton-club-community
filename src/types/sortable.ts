import { ClubMemberWithUser } from '@/pages/clubs/[id]/members';

import { WorkoutParticipant } from './workout.types';

/**
 * 정렬 가능한 대상의 타입
 * WorkoutParticipant와 ClubMemberWithUser를 포함하는 유니온 타입
 */
export type SortableItem = WorkoutParticipant | ClubMemberWithUser;

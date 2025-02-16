import { BaseEntity } from './common.types';
import { MembershipStatus } from './membership.types';
import { User } from './user.types';
import { HelperType } from '@prisma/client';

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

interface HelperStatus {
  id: number;
  workoutId: number;
  clubMemberId: number;
  helperType: HelperType;
  helped: boolean;
  updatedById: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ClubMember {
  id: number;
  helperStatuses: HelperStatus[];
  user: Pick<User, 'id' | 'thumbnailImageUrl' | 'nickname'>;
}

export interface Workout extends BaseEntity {
  title: string;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  location: string;
  WorkoutParticipant: WorkoutParticipant[];
}

export interface WorkoutParticipant {
  id: number;
  workoutId: number;
  userId: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  User: Pick<User, 'id' | 'thumbnailImageUrl' | 'nickname'>;
  clubMember?: ClubMember;
}

export interface WorkoutWithParticipants extends Workout {
  WorkoutParticipant: WorkoutParticipant[];
}

export interface WorkoutListItemProps {
  workout: Workout;
  user?: User;
  isLoggedIn: boolean;
  onParticipate: (workoutId: number, isParticipating: boolean) => void;
  membershipStatus: MembershipStatus;
}

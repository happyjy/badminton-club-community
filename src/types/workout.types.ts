import { HelperType } from '@prisma/client';

import { BaseEntity } from './common.types';
import { MembershipStatus } from './membership.types';
import { User } from './user.types';

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
  name: string;
  gender?: string;
  birthDate?: string;
  localTournamentLevel?: string;
  nationalTournamentLevel?: string;
  helperStatuses: HelperStatus[];
  // user: Pick<User, 'id' | 'thumbnailImageUrl' | 'nickname'>;
}

export interface Guest {
  id: string;
  name: string;
  userId: number;
  gender?: string;
  birthDate?: string;
  localTournamentLevel?: string;
  nationalTournamentLevel?: string;
  guestRequestName?: string;
  intendToJoin?: boolean;
  clubMember?: Pick<ClubMember, 'id' | 'name'>;
}

export interface Workout extends BaseEntity {
  title: string;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  location: string;
  clubId?: number | null;
  WorkoutParticipant: WorkoutParticipant[];
  guests?: Guest[];
  guestCount?: number;
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

import { HelperType } from '@prisma/client';

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

export interface Workout {
  id: number;
  title: string;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  location: string;
  createdAt: Date;
  updatedAt: Date;
  clubId?: number;
}

export interface WorkoutParticipant {
  id: number;
  workoutId: number;
  userId: number;
  clubMemberId?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutHelperStatus {
  id: number;
  workoutId: number;
  clubMemberId: number;
  helperType: string;
  helped: boolean;
  updatedById: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutScheduleRequest {
  startDate: string;
  endDate: string;
  weekdayStartTime: string;
  weekdayEndTime: string;
  weekendStartTime: string;
  weekendEndTime: string;
  location: string;
  maxParticipants: number;
}

export interface WorkoutScheduleResponse {
  message: string;
  count: number;
  workouts: Workout[];
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

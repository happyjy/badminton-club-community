import { BaseEntity } from './common.types';
import { User } from './user.types';

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number;
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

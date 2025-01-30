import { BaseEntity } from './common.types';
import { User } from './user.types';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Workout extends BaseEntity {
  userId: string;
  title: string;
  description?: string;
  date: Date;
  exercises: Exercise[];
}

export interface WorkoutParticipant {
  id: string;
  workoutId: string;
  userId: string;
  user: Pick<User, 'id' | 'nickname' | 'thumbnailImageUrl'>;
  joinedAt: Date;
}

export interface WorkoutWithParticipants extends Workout {
  WorkoutParticipant: WorkoutParticipant[];
}

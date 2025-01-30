export * from './common.types';
export * from './user.types';
export * from './workout.types';

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: number;
};

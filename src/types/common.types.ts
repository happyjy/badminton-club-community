export type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: number;
};

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

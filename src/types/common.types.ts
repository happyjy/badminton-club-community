export type ApiSuccessResponse<K extends string, T> = {
  data: Record<K, T>;
  status: number;
  message: string;
};

export type ApiErrorResponse = {
  error: string;
  status: number;
};

export type ApiResponse<K extends string, T> =
  | ApiSuccessResponse<K, T>
  | ApiErrorResponse;

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

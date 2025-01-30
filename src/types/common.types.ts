export type ApiSuccessResponse<K extends string, T> = Record<K, T> & {
  status: number;
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

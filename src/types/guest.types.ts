import { GuestStatus, GuestPostType } from '@prisma/client';

// Prisma enum을 TypeScript 타입으로 재사용
export type GuestStatusType = GuestStatus;
export type GuestPostTypeType = GuestPostType;

// 게스트 요청 타입 정의
export type GuestRequest = {
  id: string;
  clubMember: {
    name?: string;
  };
  name: string;
  phoneNumber: string;
  postType: GuestPostTypeType;
  status: GuestStatusType;
  createdAt: string;
  updatedAt: string;
  visitDate?: string;
  intendToJoin?: boolean;
  birthDate?: string;
  nationalTournamentLevel?: string;
  localTournamentLevel?: string;
};

// 필터 옵션 타입
export type GuestFilterOptions = {
  status?: GuestStatusType;
  postType?: GuestPostTypeType;
};

// API 응답 타입
export type GuestListResponse = {
  data: {
    items: GuestRequest[];
    total: number;
    page: number;
    limit: number;
  };
  status: number;
  message: string;
};

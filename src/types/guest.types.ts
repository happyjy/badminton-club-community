import {
  GuestStatus,
  GuestPostType,
  GuestPost,
  ClubMember,
} from '@prisma/client';

// Prisma enum을 TypeScript 타입으로 재사용
export type GuestStatusType = GuestStatus;
export type GuestPostTypeType = GuestPostType;

// Prisma 모델을 직접 사용하는 타입 (include 관계 포함)
export type GuestPostWithClubMember = GuestPost & {
  clubMember: ClubMember | null;
};

// 목록 API 응답용 — clubMember는 작성자명(name)만 반환
export type GuestPostForList = GuestPost & {
  clubMember: { name: string | null } | null;
};

// Prisma ClubMember 모델의 일부 필드만 사용하는 타입
export type GuestClubMember = {
  id: number;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  clubId: number;
  userId: number;
  role: string;
  status: string;
  birthDate: string | null;
  phoneNumber: string;
  gender: string | null;
  localTournamentLevel: string | null;
  nationalTournamentLevel: string | null;
  lessonPeriod: string | null;
  playingPeriod: string | null;
};

// 게스트 요청 타입 정의
export type GuestRequest = {
  id: string;
  clubMember: GuestClubMember | null;
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

// API 응답 타입 (목록 API는 GuestPostForList 사용 — clubMember는 name만)
export type GuestListResponse = {
  data: {
    items: GuestPostForList[];
    total: number;
    page: number;
    limit: number;
  };
  status: number;
  message: string;
};

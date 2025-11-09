// 대회 입상 기록 타입 정의

export type EventType = 'SINGLES' | 'MD' | 'WD' | 'XD';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface UserAwardRecord {
  id: number;
  userId: number;
  clubId: number | null;
  tournamentName: string;
  eventType: EventType;
  grade: Grade;
  eventDate: Date | string;
  images: string[];
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// API 요청 타입
export interface CreateAwardRequest {
  clubId?: number;
  tournamentName: string;
  eventDate: string; // YYYY-MM-DD 형식
  eventType: EventType;
  grade: Grade;
  images?: string[];
  note?: string;
}

export interface UpdateAwardRequest {
  clubId?: number | null;
  tournamentName?: string;
  eventDate?: string; // YYYY-MM-DD 형식
  eventType?: EventType;
  grade?: Grade;
  images?: string[];
  note?: string;
}

// API 응답 타입
export interface AwardResponse {
  id: number;
  userId: number;
  clubId: number | null;
  clubName?: string; // 조회 시 클럽명 포함
  tournamentName: string;
  eventType: EventType;
  grade: Grade;
  eventDate: string;
  images: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AwardListResponse {
  awards: AwardResponse[];
  total: number;
}

// 이미지 업로드 응답
export interface ImageUploadResponse {
  url: string;
  path: string;
}

// 폼 데이터 타입
export interface AwardFormData {
  clubId?: number;
  tournamentName: string;
  eventDate: string;
  eventType: EventType | '';
  grade: Grade | '';
  images: File[];
  note: string;
}

// 종목 옵션
export const EVENT_TYPE_OPTIONS = [
  { value: 'SINGLES', label: '단식' },
  { value: 'MD', label: '남자복식' },
  { value: 'WD', label: '여자복식' },
  { value: 'XD', label: '혼합복식' },
] as const;

// 급수 옵션
export const GRADE_OPTIONS = [
  { value: 'A', label: 'A급' },
  { value: 'B', label: 'B급' },
  { value: 'C', label: 'C급' },
  { value: 'D', label: 'D급' },
  { value: 'E', label: 'E급 (초심)' },
  { value: 'F', label: 'F급 (왕초심)' },
] as const;

// 종목 레이블 매핑
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  SINGLES: '단식',
  MD: '남자복식',
  WD: '여자복식',
  XD: '혼합복식',
};

// 급수 레이블 매핑
export const GRADE_LABELS: Record<Grade, string> = {
  A: 'A급',
  B: 'B급',
  C: 'C급',
  D: 'D급',
  E: 'E급 (초심)',
  F: 'F급 (왕초심)',
};


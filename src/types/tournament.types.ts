import type {
  EntryEvent,
  EntryEventStatus,
  EntryPaymentStatus,
  EntryPlayer,
  Tournament,
  TournamentEntry,
  TournamentEventType,
  TournamentStatus,
} from '@prisma/client';

// Prisma enum 재노출
export type { TournamentStatus, EntryPaymentStatus, EntryEventStatus };

// DB에 저장되지 않는 파생 상태. UPCOMING은 응답에만 존재한다.
export type TournamentEffectiveStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'OPEN'
  | 'CLOSED';

// ---------- 공통 API 응답 ----------
// 실패 응답은 기존 common.types.ts의 ApiErrorResponse를 그대로 사용한다.
// 성공 응답은 기존 ApiSuccessResponse가 data를 Record<K,T>로 감싸는 형태라
// 이 도메인 전용으로 평평한 형태를 정의한다.
export interface TournamentApiSuccess<T> {
  data: T;
  message: string;
}

// ---------- 관리자: 대회 생성/수정 입력 ----------
export interface EventTypeInput {
  id?: string; // 수정 시 기존 종목 식별용. 신규는 undefined
  name: string;
  playerCount: number;
  fee: number;
  order: number;
}

export interface TournamentInput {
  title: string;
  hostName?: string | null;
  description?: string | null;
  tournamentDate?: string | null;
  location?: string | null;
  applyStartAt?: string | null; // ISO 문자열
  applyDeadline: string; // ISO 문자열
  status: TournamentStatus;
  useTeamName: boolean;
  tshirtSizes: string[];
  bankAccount?: string | null;
  ageGroups: string[];
  levels: string[];
  eventTypes: EventTypeInput[];
}

// ---------- 신청자: 신청 제출 입력 ----------
export interface PlayerInput {
  key: string; // 폼 내부에서 종목↔선수를 잇는 임시 식별자
  name: string;
  gender: string;
  birthDate: string;
  phoneNumber: string;
  tshirtSize?: string | null;
  order: number;
}

export interface EntryEventInput {
  eventTypeId: string;
  ageGroup: string;
  level: string;
  playerKeys: string[]; // PlayerInput.key 참조
}

export interface EntrySubmissionInput {
  depositorName: string;
  teamName?: string | null;
  players: PlayerInput[];
  events: EntryEventInput[];
  privacyAgreed: boolean;
}

// ---------- 관리자용: 민감정보 포함 ----------
export type EntryEventWithDetail = EntryEvent & {
  eventType: TournamentEventType;
  eventPlayers: Array<{ entryPlayer: EntryPlayer }>;
};

export type EntryForAdmin = TournamentEntry & {
  players: EntryPlayer[];
  entryEvents: EntryEventWithDetail[];
  clubMember: { id: number; name: string | null };
};

export type TournamentWithOptions = Tournament & {
  eventTypes: TournamentEventType[];
};

// 대회 상세 응답 (회원용)
export interface TournamentDetailResponse {
  tournament: TournamentWithOptions;
  effectiveStatus: TournamentEffectiveStatus;
  myEntryId: string | null;
}

import { BaseEntity } from './common.types';
import { UserProfile } from './user.types';
import { Role, Status } from './enums';

// 클럽 생성/수정 시 필요한 데이터 타입
export interface ClubInput {
  name: string;
  description?: string | null;
  location: string;
  meetingTime: string;
  maxMembers: number;
  etc?: string | null;
}

// 클럽 멤버 타입
export interface ClubMember extends BaseEntity {
  userId: number;
  clubId: number;
  role: Role;
  status: Status;
  user?: UserProfile;
}

// 기본 클럽 타입
export interface Club extends BaseEntity {
  name: string;
  description?: string | null;
  location: string;
  meetingTime: string;
  maxMembers: number;
  etc?: string | null;
  members?: ClubMember[];
}

// 상세 정보가 포함된 클럽 타입
export interface ClubWithDetails extends Club {
  members: ClubMember[];
}

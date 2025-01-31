import { BaseEntity } from './common.types';
import { User } from './user.types';

export interface Club extends BaseEntity {
  name: string;
  description?: string;
  location: string;
  meetingTime: string;
  maxMembers: number;
  etc?: string;
  members?: ClubMember[];
}

export interface ClubMember extends BaseEntity {
  clubId: number;
  userId: number;
  role: 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  user?: User;
  club?: Club;
}

import { BaseEntity } from './common.types';
import { UserProfile } from './user.types';
import { Role, Status } from './enums';
import { User } from '@prisma/client';

// 클럽 생성/수정 시 필요한 데이터 타입
export interface ClubInput {
  name: string;
  description?: string | null;
  location: string;
  meetingTime: string;
  maxMembers: number;
  etc?: string | null;
}

// 클럽 가입 타입
export interface ClubJoinFormData {
  name: string;
  birthDate: string;
  phoneNumber: string;
  localTournamentLevel: string;
  nationalTournamentLevel: string;
  lessonPeriod: string;
  playingPeriod: string;
  intendToJoin?: boolean;
  visitDate?: string;
  message?: string;
}

// 클럽 게스트 신청 타입
export interface ClubGuestApplication extends ClubJoinFormData {
  name: string;
  phoneNumber: string;
  message?: string;
}

// 클럽 멤버 타입
export interface ClubMember extends BaseEntity {
  userId: number;
  clubId: number;
  role: Role;
  status: Status;
  name?: string;
  birthDate?: string;
  localTournamentLevel?: string;
  nationalTournamentLevel?: string;
  lessonPeriod?: string;
  playingPeriod?: string;
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

// 클럽 멤버 타입
export type ClubWithMembers = Club & {
  members: (ClubMember & {
    user: Pick<User, 'id' | 'nickname' | 'thumbnailImageUrl'>;
  })[];
};

/* 
const clubWithMembers: ClubWithMembers = {
  // Club의 기본 속성들
  id: "club-1",
  name: "독서 클럽",
  description: "함께 책을 읽어요",
  
  // members 배열
  members: [
    {
      // ClubMember의 속성들
      clubId: "club-1",
      userId: "user-1",
      role: "ADMIN",
      
      // User 정보 (Pick으로 선택된 필드들)
      user: {
        id: "user-1",
        nickname: "책벌레",
        thumbnailImageUrl: "https://..."
      }
    }
  ]
};
*/

export type ClubMembershipResponse = ClubMember;

export interface ClubResponse {
  clubId: number;
  role: string;
  club: {
    name: string;
  };
}

export interface ClubDetailPageProps {
  user: User;
  isLoggedIn: boolean;
}

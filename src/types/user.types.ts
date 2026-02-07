import { BaseEntity } from './common.types';

export interface User extends BaseEntity {
  id: number;
  email: string | null;
  nickname: string;
  thumbnailImageUrl: string | null;
  kakaoId?: string;
}

export interface UserProfile extends Pick<
  User,
  'id' | 'nickname' | 'thumbnailImageUrl'
> {
  // 프로필에만 필요한 추가 필드.
  bio?: string;
}

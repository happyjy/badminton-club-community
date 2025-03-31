import { z } from 'zod';

import { Role, Status } from '@/types/enums';

// 기본 사용자 프로필 스키마
export const UserProfileSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  thumbnailImageUrl: z.string().nullable(),
});

// 클럽 멤버 스키마
export const ClubMemberSchema = z.object({
  id: z.number(),
  clubId: z.number(),
  userId: z.number(),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(Status),
  user: UserProfileSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 클럽 스키마
export const ClubSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  location: z.string(),
  meetingTime: z.string(),
  maxMembers: z.number(),
  etc: z.string().nullable(),
  members: z.array(ClubMemberSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

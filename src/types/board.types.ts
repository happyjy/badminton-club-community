import { Post, PostCategory, PostComment } from '@prisma/client';
import { ClubMember } from './club.types';

// PostCategory with relations
export interface PostCategoryWithRelations extends PostCategory {
  club: {
    id: number;
    name: string;
  };
  _count?: {
    posts: number;
  };
}

// Post with relations
export interface PostWithRelations extends Post {
  category: PostCategory;
  author: ClubMember;
  _count?: {
    comments: number;
  };
}

// PostComment with relations
export interface PostCommentWithRelations extends PostComment {
  author: ClubMember | null;
  children?: PostCommentWithRelations[];
}

// API Response Types
export interface PostListResponse {
  data: {
    items: PostWithRelations[];
    total: number;
    page: number;
    limit: number;
  };
  status: number;
  message: string;
}

export interface PostDetailResponse {
  data: PostWithRelations;
  status: number;
  message: string;
}

export interface PostCategoryListResponse {
  data: PostCategoryWithRelations[];
  status: number;
  message: string;
}

export interface PostCommentListResponse {
  data: PostCommentWithRelations[];
  status: number;
  message: string;
}

// Request Types
export interface CreatePostRequest {
  categoryId: number;
  title: string;
  content: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  categoryId?: number;
}

export interface CreatePostCategoryRequest {
  name: string;
  description?: string;
  allowedRoles: string[];
  order?: number;
  isActive?: boolean;
}

export interface UpdatePostCategoryRequest {
  name?: string;
  description?: string;
  allowedRoles?: string[];
  order?: number;
  isActive?: boolean;
}

export interface CreatePostCommentRequest {
  content: string;
  parentId?: string;
}

export interface UpdatePostCommentRequest {
  content: string;
}

export interface ReorderCategoriesRequest {
  categoryIds: number[];
}

// Sort options
export type PostSortOption = 'latest' | 'views' | 'likes' | 'comments';

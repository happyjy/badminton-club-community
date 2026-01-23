---
name: 게시판 기능 Phase별 구현
overview: 게시판 기능을 Phase별로 단계적으로 구현합니다. Phase 1부터 시작하여 각 Phase 완료 후 다음 단계로 진행하며, 문서의 체크리스트를 참고하여 구현 상태를 관리합니다.
todos: []
---

# 게시판 기능 Phase별 구현 계획

## Phase 1: 기본 구조 (우선순위: 높음)

### 1.1 데이터베이스 스키마 설계 및 마이그레이션

**작업 내용:**

- `prisma/schema/board.prisma` 파일 생성
- PostCategory 모델: 카테고리 관리 (allowedRoles, order, isActive 포함)
- Post 모델: 게시글 (title, content, viewCount, likeCount, isPinned, isDeleted 포함)
- PostComment 모델: 댓글 (parentId, isDeleted, likeCount 포함)
- Club, ClubMember 모델에 관계 추가
- `prisma/build-schema.ts`에 board.prisma 추가
- 마이그레이션 실행: `npx prisma migrate dev --name add_board_models`

**참고 파일:**

- [prisma/schema.prisma](prisma/schema.prisma) - 기존 스키마 구조
- [prisma/build-schema.ts](prisma/build-schema.ts) - 스키마 빌드 스크립트
- [ProductRequirementDoc/게시판기능.md](ProductRequirementDoc/게시판기능.md) - 스키마 설계 참고 (라인 205-264)

### 1.2 권한 체크 유틸리티 함수 구현

**작업 내용:**

- `src/utils/boardPermissions.ts` 파일 생성
- 함수 구현:
- `canCreatePostInCategory(allowedRoles: string[], userRole: string): boolean` - 카테고리별 작성 권한
- `canEditPost(postAuthorId: number, currentUserId: number, clubMember: ClubMember): boolean` - 게시글 수정/삭제 권한
- `canPinPost(clubMember: ClubMember): boolean` - 게시글 고정 권한
- `canManageCategory(clubMember: ClubMember): boolean` - 카테고리 관리 권한

**참고 파일:**

- [src/utils/permissions.ts](src/utils/permissions.ts) - 기존 권한 체크 패턴

### 1.3 카테고리 관리 API 구현

**작업 내용:**

- `src/pages/api/clubs/[id]/board/categories/index.ts` - GET(목록), POST(생성)
- `src/pages/api/clubs/[id]/board/categories/[categoryId].ts` - PUT(수정), DELETE(삭제)
- `src/pages/api/clubs/[id]/board/categories/reorder.ts` - PATCH(순서 변경)
- 모든 API에 관리자 권한 체크 적용

**참고 파일:**

- [src/pages/api/clubs/[id]/guests/index.ts](src/pages/api/clubs/[id]/guests/index.ts) - 기존 API 패턴
- [src/pages/api/clubs/[id]/guests/[guestId]/index.ts](src/pages/api/clubs/[id]/guests/[guestId]/index.ts) - 수정/삭제 패턴

### 1.4 게시글 CRUD API 구현

**작업 내용:**

- `src/pages/api/clubs/[id]/board/posts/index.ts` - GET(목록, categoryId, page, limit, sort 쿼리), POST(작성)
- `src/pages/api/clubs/[id]/board/posts/[postId]/index.ts` - GET(상세), PUT(수정), DELETE(삭제)
- `src/pages/api/clubs/[id]/board/posts/[postId]/pin.ts` - PATCH(고정/해제)
- `src/pages/api/clubs/[id]/board/posts/[postId]/like.ts` - POST(좋아요 토글)
- 권한 체크 적용 (작성 권한, 수정/삭제 권한, 고정 권한)

**참고 파일:**

- [src/pages/api/clubs/[id]/guests/index.ts](src/pages/api/clubs/[id]/guests/index.ts) - 목록 조회 패턴
- [src/pages/api/clubs/[id]/guests/[guestId]/index.ts](src/pages/api/clubs/[id]/guests/[guestId]/index.ts) - 상세/수정/삭제 패턴

### 1.5 댓글 CRUD API 구현

**작업 내용:**

- `src/pages/api/clubs/[id]/board/posts/[postId]/comments/index.ts` - GET(목록), POST(작성, parentId 지원)
- `src/pages/api/clubs/[id]/board/posts/[postId]/comments/[commentId].ts` - PUT(수정), DELETE(삭제, soft delete)
- `src/pages/api/clubs/[id]/board/posts/[postId]/comments/[commentId]/like.ts` - POST(좋아요 토글)
- 대댓글 구조 지원 (parentId)

**참고 파일:**

- [src/pages/api/clubs/[id]/guests/[guestId]/comments/index.ts](src/pages/api/clubs/[id]/guests/[guestId]/comments/index.ts) - 댓글 API 패턴
- [src/pages/api/clubs/[id]/guests/[guestId]/comments/[commentId].ts](src/pages/api/clubs/[id]/guests/[guestId]/comments/[commentId].ts) - 댓글 수정/삭제 패턴

### Phase 1 체크리스트 업데이트

- 문서의 체크리스트를 업데이트하여 진행 상황 관리

---

## Phase 2: 프론트엔드 기본 기능 (Phase 1 완료 후 진행)

### 2.1 ClubNavigation에 게시판 메뉴 추가

- [src/components/organisms/navigation/clubNavigation/ClubNavigation.tsx](src/components/organisms/navigation/clubNavigation/ClubNavigation.tsx) 96번째 줄 주석 해제 및 수정

### 2.2 카테고리 탭 컴포넌트

- `src/components/organisms/board/BoardCategoryTabs.tsx` 생성
- ClubNavigation 스타일 참고하여 가로 스크롤 탭 구현

### 2.3 게시판 목록 페이지

- `src/pages/clubs/[id]/board/index.tsx` 구현
- PostList, PostCard 컴포넌트 생성

### 2.4 게시글 상세 페이지

- `src/pages/clubs/[id]/board/[postId]/index.tsx` 생성
- PostDetail 컴포넌트 생성

### 2.5 게시글 작성/수정 페이지

- `src/pages/clubs/[id]/board/new.tsx` 생성
- `src/pages/clubs/[id]/board/[postId]/edit.tsx` 생성
- PostForm 컴포넌트 생성

### 2.6 댓글 컴포넌트

- `src/components/molecules/board/CommentItem.tsx` 생성
- `src/components/molecules/board/CommentList.tsx` 생성
- 대댓글 기능 포함

---

## Phase 3: 고급 기능 (Phase 2 완료 후 진행)

### 3.1 무한 스크롤 (모바일)

- Intersection Observer 사용
- 모바일 환경 (< 768px)에서만 적용

### 3.2 페이지네이션 (PC)

- PC 환경 (≥ 768px)에서 페이지네이션 버튼
- 스크롤 위치 복원 기능

### 3.3 좋아요 기능

- 게시글/댓글 좋아요 UI 구현
- 실시간 좋아요 수 업데이트

### 3.4 조회수 증가

- 게시글 상세 조회 시 조회수 자동 증가

### 3.5 게시글 고정 기능

- 관리자만 고정 버튼 표시
- 고정 게시글 목록 상단 표시

---

## Phase 4: 카테고리 관리 UI (Phase 3 완료 후 진행)

### 4.1 카테고리 관리 페이지

- `src/pages/clubs/[id]/board/categories/index.tsx` 생성
- 관리자 전용 페이지

### 4.2 카테고리 생성/수정 폼

- CategoryManageForm 컴포넌트 생성
- allowedRoles 설정 기능

### 4.3 카테고리 순서 변경

- 드래그 앤 드롭 또는 순서 변경 UI

---

## Phase 5: 추가 기능 (Phase 4 완료 후 진행)

### 5.1 검색 기능

- 제목, 내용, 작성자 검색

### 5.2 정렬 옵션 확장

- 조회수순, 좋아요순, 댓글순 정렬

### 5.3 이미지 첨부 (향후)

### 5.4 파일 첨부 (향후)

### 5.5 알림 기능 (향후)

---

## 구현 규칙 준수

- 컴포넌트 export는 파일 하단에 별도로 분리
- 이벤트 핸들러는 'on' 접두사 사용
- axios 사용 (fetch 대신)
- early return 패턴 사용
- PrismaClient는 `import { PrismaClient } from '@prisma/client'` 방식 사용
- 반응형 디자인 (Tailwind CSS)
- TypeScript strict 모드 준수

---

## 타입 정의

- `src/types/board.types.ts` 파일 생성
- Post, PostCategory, PostComment 관련 타입 정의
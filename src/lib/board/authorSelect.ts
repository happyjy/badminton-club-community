// 게시글 작성자로 응답에 싣는 회원 필드.
// author: true로 두면 전화번호·생년월일까지 전부 나가므로 화면에 쓰는 것만 고른다.
export const BOARD_AUTHOR_SELECT = {
  id: true,
  clubId: true,
  userId: true,
  name: true,
  role: true,
  status: true,
} as const;

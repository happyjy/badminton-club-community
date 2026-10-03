import { ClubAuthError, requireClubAdmin } from '@/lib/clubAuth';

type GuestPostOwner = {
  clubId: number;
  userId: number;
};

/**
 * 게스트 신청서(전화번호·생년월일 포함)를 볼 수 있는지 판단한다.
 * 작성자 본인과 신청한 클럽의 임원만 볼 수 있다.
 */
export async function canViewGuestPost(
  userId: number,
  guestPost: GuestPostOwner
): Promise<boolean> {
  if (guestPost.userId === userId) return true;

  try {
    await requireClubAdmin(userId, guestPost.clubId);
    return true;
  } catch (error) {
    if (error instanceof ClubAuthError) return false;
    throw error;
  }
}

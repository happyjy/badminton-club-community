import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { useClubMember } from '@/hooks/useClubMember';

import { RootState } from '@/store';
import { setClubMember, setInitClubMember } from '@/store/features/authSlice';
import { ClubMember } from '@/types';

/**
 * 현재 클럽에서의 내 회원 정보를 받아 스토어(auth.clubMember)에 넣는다.
 * 메뉴와 여러 화면이 이 값으로 회원·운영진 여부를 판단한다.
 * 클럽을 벗어나거나 다른 클럽으로 가면 이전 정보가 남지 않게 비운다.
 */
export function useSyncClubMember(clubId: string | undefined): void {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { data } = useClubMember(clubId, userId);

  useEffect(() => {
    if (clubId && data) {
      dispatch(setClubMember(data as unknown as ClubMember));
    } else {
      dispatch(setInitClubMember());
    }
  }, [clubId, data, dispatch]);
}

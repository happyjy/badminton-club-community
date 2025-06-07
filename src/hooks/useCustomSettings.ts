import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import {
  ClubHomeSettings,
  GuestPageSettings,
} from '@/types/custom-settings.types';

// 클럽 홈 설정 조회
export const useClubHomeSettings = (clubId: string) => {
  return useQuery<ClubHomeSettings>({
    queryKey: ['clubHomeSettings', clubId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/clubs/${clubId}/custom/home`);
      return data;
    },
    enabled: !!clubId,
  });
};

// 게스트 페이지 설정 조회
export const useGuestPageSettings = (clubId: string) => {
  return useQuery<GuestPageSettings>({
    queryKey: ['guestPageSettings', clubId],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/clubs/${clubId}/custom/guest-page`
      );
      return data;
    },
    enabled: !!clubId,
  });
};

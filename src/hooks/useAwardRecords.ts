import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import {
  AwardResponse,
  CreateAwardRequest,
  UpdateAwardRequest,
  ApiResponse,
  ImageUploadResponse,
} from '@/types';

// 내 입상 기록 조회 (특정 클럽)
function useMyAwardRecords(clubId: number | undefined) {
  return useQuery<AwardResponse[]>({
    queryKey: ['awards', 'club', clubId, 'me'],
    queryFn: async (): Promise<AwardResponse[]> => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');

      const response = await axios.get<ApiResponse<'awards', AwardResponse[]>>(
        `/api/clubs/${clubId}/awards`
      );

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      return response.data.data.awards;
    },
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    enabled: !!clubId,
    retry: 1,
  });
}

// 특정 사용자의 입상 기록 조회
function useUserAwardRecords(userId: number | undefined) {
  return useQuery<AwardResponse[]>({
    queryKey: ['awards', 'user', userId],
    queryFn: async (): Promise<AwardResponse[]> => {
      if (!userId) throw new Error('사용자 ID가 필요합니다');

      const response = await axios.get<ApiResponse<'awards', AwardResponse[]>>(
        `/api/users/${userId}/awards`
      );

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      return response.data.data.awards;
    },
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    enabled: !!userId,
    retry: 1,
  });
}

// 이미지 업로드
function useUploadImage() {
  return useMutation<ImageUploadResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post<
        ApiResponse<'image', ImageUploadResponse>
      >('/api/uploads/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      return response.data.data.image;
    },
  });
}

// 입상 기록 생성
function useCreateAward(clubId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation<AwardResponse, Error, CreateAwardRequest>({
    mutationFn: async (data: CreateAwardRequest) => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');

      const response = await axios.post<ApiResponse<'award', AwardResponse>>(
        `/api/clubs/${clubId}/awards`,
        data
      );

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      return response.data.data.award;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards', 'club', clubId] });
    },
  });
}

// 입상 기록 수정
function useUpdateAward(clubId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    AwardResponse,
    Error,
    { awardId: number; data: UpdateAwardRequest }
  >({
    mutationFn: async ({ awardId, data }) => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');

      const response = await axios.patch<ApiResponse<'award', AwardResponse>>(
        `/api/clubs/${clubId}/awards/${awardId}`,
        data
      );

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      return response.data.data.award;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards', 'club', clubId] });
    },
  });
}

// 입상 기록 삭제
function useDeleteAward(clubId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, number>({
    mutationFn: async (awardId: number) => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');

      const response = await axios.delete<
        ApiResponse<'success', { ok: boolean }>
      >(`/api/clubs/${clubId}/awards/${awardId}`);

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      return response.data.data.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards', 'club', clubId] });
    },
  });
}

export {
  useMyAwardRecords,
  useUserAwardRecords,
  useUploadImage,
  useCreateAward,
  useUpdateAward,
  useDeleteAward,
};


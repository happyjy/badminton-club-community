import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface BatchStats {
  pending: number;
  matched: number;
  confirmed: number;
  error: number;
  skipped: number;
}

export interface UploadBatchItem {
  id: string;
  uploadedAt: string;
  fileName: string;
  uploadedByName: string | null;
  recordCount: number;
  minTransactionDate: string | null;
  maxTransactionDate: string | null;
  stats: BatchStats;
}

interface BatchesResponse {
  data: { batches: UploadBatchItem[] };
  status: number;
  message: string;
}

function useUploadBatches(clubId: string | undefined) {
  return useQuery<UploadBatchItem[]>({
    queryKey: ['uploadBatches', clubId],
    queryFn: async () => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');

      const response = await axios.get<BatchesResponse>(
        `/api/clubs/${clubId}/membership-fee/batches`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.batches;
    },
    enabled: !!clubId,
    staleTime: 1000 * 60,
  });
}

export { useUploadBatches };

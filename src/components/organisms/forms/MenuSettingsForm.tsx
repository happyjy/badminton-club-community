import { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';

import { useMenuSettings } from '@/hooks/useCustomSettings';

interface MenuSettingsFormProps {
  clubId: string;
}

function MenuSettingsForm({ clubId }: MenuSettingsFormProps) {
  const queryClient = useQueryClient();
  const { data } = useMenuSettings(clubId);
  const [tournamentMenuEnabled, setTournamentMenuEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 초기 데이터 설정
  useEffect(() => {
    if (data) {
      setTournamentMenuEnabled(data.tournamentMenuEnabled);
    }
  }, [data]);

  // 메뉴 설정 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.put(`/api/clubs/${clubId}/custom/menu`, {
        tournamentMenuEnabled,
      });
      // 클럽 네비게이션이 바로 반영되도록 캐시를 무효화한다.
      await queryClient.invalidateQueries({
        queryKey: ['menuSettings', clubId],
      });
      toast.success('메뉴 설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving menu settings:', error);
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="flex min-h-11 items-center text-callout font-medium text-primary">
          <Checkbox
            checked={tournamentMenuEnabled}
            onChange={(e) => setTournamentMenuEnabled(e.target.checked)}
          />
          대회 신청 메뉴 보이기
        </label>
        <p className="mt-1 text-footnote text-secondary">
          끄면 클럽 메뉴에서 대회 신청 탭이 사라집니다. 이미 공유한 대회 링크는
          그대로 열립니다.
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}

export default MenuSettingsForm;

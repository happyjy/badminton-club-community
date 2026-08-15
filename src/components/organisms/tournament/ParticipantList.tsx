import { formatEventLabel } from '@/lib/tournament/display';
import type { PublicParticipant } from '@/types/tournament.types';

interface ParticipantListProps {
  participants: PublicParticipant[];
}

/**
 * 회원 전체에게 공개되는 참가자 목록.
 * 서버가 이름과 종목만 내려주므로 민감정보는 애초에 여기 도달하지 않는다.
 */
function ParticipantList({ participants }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
        아직 신청자가 없습니다.
      </p>
    );
  }

  // 종목별로 묶어 보여준다 (파트너 찾기 용도)
  const grouped = participants.reduce<Record<string, string[]>>(
    (acc, participant) => {
      const key = formatEventLabel(participant);
      acc[key] = acc[key] ?? [];
      acc[key].push(participant.name);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([label, names]) => (
        <div key={label} className="rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="mt-1 text-sm text-gray-600">{names.join(', ')}</p>
        </div>
      ))}
    </div>
  );
}

export default ParticipantList;

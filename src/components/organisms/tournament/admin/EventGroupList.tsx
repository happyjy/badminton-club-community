import { PAYMENT_CLASS, PAYMENT_LABEL } from '@/lib/tournament/display';
import type {
  EventGroup,
  GroupedTeam,
} from '@/lib/tournament/groupEntriesByEvent';

interface EventGroupListProps {
  /** 회원 기준 라벨. null이면 회원 여부를 표시하지 않는다 */
  memberLabel?: string | null;
  groups: EventGroup[];
  useTeamName: boolean;
}

/** 팀을 이룬 선수를 '이름 · 이름' 형태로 잇는다. 단식이면 이름 하나만 남는다. */
function TeamPlayerNames({ team }: { team: GroupedTeam }) {
  return (
    <span className="font-medium">
      {team.players.map((player) => player.name).join(' · ')}
    </span>
  );
}

function EventGroupList({
  groups,
  useTeamName,
  memberLabel,
}: EventGroupListProps) {
  if (groups.length === 0) {
    return (
      <p className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
        신청 내역이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section
          key={group.label}
          className="rounded-lg border border-gray-200 p-4"
        >
          <h3 className="mb-3 font-medium">
            {group.label}{' '}
            <span className="text-sm text-gray-400">
              {group.teams.length}팀 / {group.playerCount}명
            </span>
          </h3>

          <ul className="space-y-2">
            {group.teams.map((team, index) => (
              <li
                key={`${team.entryId}-${index}`}
                className="rounded-md bg-gray-50 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <div className="flex items-baseline gap-2">
                    {/* 팀 번호가 있어야 인원이 많은 종목에서 줄을 세어 읽기 쉽다. */}
                    <span className="text-xs text-gray-400">{index + 1}</span>
                    <TeamPlayerNames team={team} />
                    {useTeamName && team.teamName && (
                      <span className="text-xs text-gray-500">
                        ({team.teamName})
                      </span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${PAYMENT_CLASS[team.paymentStatus]}`}
                  >
                    {PAYMENT_LABEL[team.paymentStatus]}
                  </span>
                </div>

                {/* 연락처·티셔츠는 한 단계 낮춰 팀 경계가 먼저 읽히게 한다. */}
                <ul className="mt-1 space-y-0.5 pl-5">
                  {team.players.map((player, playerIndex) => (
                    <li
                      key={`${player.name}-${playerIndex}`}
                      className="flex flex-wrap items-baseline gap-x-2 text-xs text-gray-500"
                    >
                      <span>{player.name}</span>
                      {/* 연령부 자격을 확인하려면 관리자에게 생년월일이 필요하다. */}
                      <span>{player.birthDate || '-'}</span>
                      <span>{player.phoneNumber}</span>
                      <span>티셔츠 {player.tshirtSize ?? '-'}</span>
                      {/* 추가금 대상자를 임원이 한눈에 보고 입금액을 대조한다. */}
                      {memberLabel && !player.isLocalMember && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                          {memberLabel} 아님
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default EventGroupList;

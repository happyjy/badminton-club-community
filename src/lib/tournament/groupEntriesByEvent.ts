import type { EntryPaymentStatus } from '@/types/tournament.types';

import { formatEventLabel } from './display';

/** 종목 묶음 안에서 한 팀을 이루는 선수 한 명. */
export interface GroupedPlayer {
  name: string;
  birthDate: string;
  phoneNumber: string;
  tshirtSize: string | null;
  isClubMember: boolean;
}

/**
 * 한 신청서가 한 종목에 낸 팀 하나.
 * 복식이면 players가 2명, 단식이면 1명이다.
 */
export interface GroupedTeam {
  entryId: string;
  depositorName: string;
  teamName: string | null;
  paymentStatus: EntryPaymentStatus;
  players: GroupedPlayer[];
}

/** 종목 하나에 모인 팀 목록. */
export interface EventGroup {
  label: string;
  teams: GroupedTeam[];
  playerCount: number;
}

/** 그룹핑에 필요한 최소 형태만 받는다. Prisma 전체 타입에 묶이지 않게 한다. */
interface GroupableEntry {
  id: string;
  depositorName: string;
  teamName: string | null;
  paymentStatus: EntryPaymentStatus;
  entryEvents: Array<{
    status: string;
    ageGroup: string;
    level: string;
    eventType: { name: string };
    eventPlayers: Array<{
      entryPlayer: {
        name: string;
        birthDate: string;
        phoneNumber: string;
        tshirtSize: string | null;
        isClubMember: boolean;
      };
    }>;
  }>;
}

/**
 * 신청 목록을 종목별로 묶고, 종목 안에서는 다시 팀 단위로 묶는 함수
 *
 * 선수를 평평하게 늘어놓으면 복식에서 누가 누구와 한 팀인지 알 수 없다.
 * 신청서 하나가 한 종목에 낸 eventPlayers가 곧 한 팀이므로, 그 경계를
 * 유지한 채로 쌓는다.
 *
 * 취소(CANCELED)된 종목은 제외한다. 신청서 자체의 입금 상태는 팀에 남겨
 * 화면에서 배지로 보여준다.
 *
 * @param entries - 관리자용 신청 목록
 * @returns 종목별 묶음 배열. 종목이 처음 등장한 순서를 유지한다.
 */
export function groupEntriesByEvent(entries: GroupableEntry[]): EventGroup[] {
  const groups = new Map<string, GroupedTeam[]>();

  for (const entry of entries) {
    for (const event of entry.entryEvents) {
      if (event.status !== 'ACTIVE') continue;

      const label = formatEventLabel({
        eventType: event.eventType.name,
        ageGroup: event.ageGroup,
        level: event.level,
      });

      const teams = groups.get(label) ?? [];
      teams.push({
        entryId: entry.id,
        depositorName: entry.depositorName,
        teamName: entry.teamName,
        paymentStatus: entry.paymentStatus,
        players: event.eventPlayers.map((eventPlayer) => ({
          name: eventPlayer.entryPlayer.name,
          birthDate: eventPlayer.entryPlayer.birthDate,
          phoneNumber: eventPlayer.entryPlayer.phoneNumber,
          tshirtSize: eventPlayer.entryPlayer.tshirtSize,
          isClubMember: eventPlayer.entryPlayer.isClubMember,
        })),
      });
      groups.set(label, teams);
    }
  }

  return Array.from(groups.entries()).map(([label, teams]) => ({
    label,
    teams,
    playerCount: teams.reduce((sum, team) => sum + team.players.length, 0),
  }));
}

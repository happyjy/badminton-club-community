import type {
  EntryEventStatus,
  EntryPaymentStatus,
} from '@/types/tournament.types';

export type CsvEntry = {
  depositorName: string;
  teamName: string | null;
  paymentStatus: EntryPaymentStatus;
  /** 외부(비로그인) 신청 여부 */
  isExternal: boolean;
  /** 외부 신청자의 연락처. 회원 신청서에는 없다 */
  contactPhone: string | null;
  entryEvents: Array<{
    status: EntryEventStatus;
    fee: number;
    ageGroup: string;
    level: string;
    eventType: { name: string };
    eventPlayers: Array<{
      entryPlayer: {
        name: string;
        gender: string;
        birthDate: string;
        phoneNumber: string;
        tshirtSize: string | null;
        isClubMember: boolean;
      };
    }>;
  }>;
};

/** 한 선수를 설명하는 열 묶음. 선수1·선수2에 같은 순서로 반복된다. */
const PLAYER_FIELDS = [
  '이름',
  '성별',
  '생년월일',
  '전화번호',
  '티셔츠',
  '소속여부',
] as const;

/** 복식은 2명이 한 팀이다. 스키마상 이보다 많은 선수는 한 종목에 들어오지 않는다. */
const PLAYERS_PER_TEAM = 2;

export const CSV_HEADER = [
  '종목',
  '연령',
  '급수',
  ...Array.from({ length: PLAYERS_PER_TEAM }, (_, index) =>
    PLAYER_FIELDS.map((field) => `선수${index + 1}${field}`)
  ).flat(),
  '팀명',
  '입금자명',
  '참가비',
  '입금상태',
  '신청경로',
  '신청자연락처',
];

const PAYMENT_STATUS_LABEL: Record<EntryPaymentStatus, string> = {
  PENDING: '입금대기',
  CONFIRMED: '입금확인',
  CANCELED: '취소',
};

type CsvPlayer =
  CsvEntry['entryEvents'][number]['eventPlayers'][number]['entryPlayer'];

/**
 * 선수 한 명의 열을 만든다.
 * 선수가 없는 자리(단식의 선수2)는 빈 칸으로 채워 열이 밀리지 않게 한다.
 */
function playerCells(player: CsvPlayer | undefined): string[] {
  if (!player) return PLAYER_FIELDS.map(() => '');

  return [
    player.name,
    player.gender,
    player.birthDate,
    player.phoneNumber,
    player.tshirtSize ?? '',
    player.isClubMember ? '소속' : '외부',
  ];
}

/**
 * 주최측 제출용 CSV 행을 만든다.
 * 종목 신청 하나가 한 팀이므로 한 행이 곧 한 팀이다.
 * 복식 파트너는 선수1·선수2 열에 나란히 들어가고, 단식은 선수2가 빈 칸이 된다.
 * 참가비는 팀 단위 스냅샷이라 행마다 한 번만 적는다.
 */
export function toCsvRows(entries: CsvEntry[]): string[][] {
  return entries.flatMap((entry) =>
    entry.entryEvents
      .filter((event) => event.status === 'ACTIVE')
      .map((event) => [
        event.eventType.name,
        event.ageGroup,
        event.level,
        ...Array.from({ length: PLAYERS_PER_TEAM }, (_, index) =>
          playerCells(event.eventPlayers[index]?.entryPlayer)
        ).flat(),
        entry.teamName ?? '',
        entry.depositorName,
        String(event.fee),
        PAYMENT_STATUS_LABEL[entry.paymentStatus],
        entry.isExternal ? '외부' : '회원',
        entry.contactPhone ?? '',
      ])
  );
}

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// UTF-8 BOM. 이게 없으면 엑셀이 CSV를 ANSI로 읽어 한글이 깨진다.
// 리터럴로 넣으면 보이지 않는 문자라 lint가 막으므로 이스케이프로 표기한다.
const UTF8_BOM = '\uFEFF';

/**
 * CSV 문자열로 직렬화한다.
 * 앞에 BOM을 붙여야 엑셀에서 한글이 깨지지 않는다.
 */
export function toCsvString(rows: string[][]): string {
  const body = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  return `${UTF8_BOM}${body}`;
}

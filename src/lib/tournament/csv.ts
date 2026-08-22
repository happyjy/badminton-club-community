import type {
  EntryEventStatus,
  EntryPaymentStatus,
} from '@/types/tournament.types';

export type CsvEntry = {
  depositorName: string;
  teamName: string | null;
  paymentStatus: EntryPaymentStatus;
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
        isLocalMember: boolean;
        isClubMember: boolean;
      };
    }>;
  }>;
};

export const CSV_HEADER = [
  '종목',
  '연령',
  '급수',
  '이름',
  '성별',
  '생년월일',
  '전화번호',
  '티셔츠',
  '소속',
  '회원여부',
  '팀명',
  '입금자명',
  '참가비',
  '입금상태',
];

const PAYMENT_STATUS_LABEL: Record<EntryPaymentStatus, string> = {
  PENDING: '입금대기',
  CONFIRMED: '입금확인',
  CANCELED: '취소',
};

/**
 * 주최측 제출용 CSV 행을 만든다.
 * 종목 단위로 전개하므로 한 선수가 2종목이면 2행이 나온다.
 */
export function toCsvRows(entries: CsvEntry[]): string[][] {
  return entries.flatMap((entry) =>
    entry.entryEvents
      .filter((event) => event.status === 'ACTIVE')
      .flatMap((event) =>
        event.eventPlayers.map(({ entryPlayer }) => [
          event.eventType.name,
          event.ageGroup,
          event.level,
          entryPlayer.name,
          entryPlayer.gender,
          entryPlayer.birthDate,
          entryPlayer.phoneNumber,
          entryPlayer.tshirtSize ?? '',
          entryPlayer.isClubMember ? '내부' : '외부',
          entryPlayer.isLocalMember ? '회원' : '비회원',
          entry.teamName ?? '',
          entry.depositorName,
          String(event.fee),
          PAYMENT_STATUS_LABEL[entry.paymentStatus],
        ])
      )
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

export interface PlayerFormValue {
  key: string;
  name: string;
  gender: string;
  birthDate: string;
  phoneNumber: string;
  tshirtSize: string;
  isClubMember: boolean;
}

export interface EventFormValue {
  eventTypeId: string;
  ageGroup: string;
  level: string;
  playerKeys: string[];
}

export interface EntryFormValues {
  depositorName: string;
  teamName: string;
  players: PlayerFormValue[];
  events: EventFormValue[];
  privacyAgreed: boolean;
}

export const GENDER_OPTIONS = [
  { value: '남', label: '남' },
  { value: '여', label: '여' },
];

/**
 * 회원 정보의 성별('남성'·'여성')을 신청 폼의 선택지('남'·'여')로 바꾼다.
 * 값이 맞지 않으면 선택 상자가 빈 칸으로 보이고 자동 채움이 되지 않는다.
 */
export function toEntryGender(gender: string | null | undefined): string {
  switch (gender) {
    case '남':
    case '남성':
    case 'MALE':
      return '남';
    case '여':
    case '여성':
    case 'FEMALE':
      return '여';
    default:
      return '';
  }
}

/** 폼 내부에서만 쓰는 선수 식별자를 만든다. 서버 id와 무관하다. */
export function createPlayerKey(index: number): string {
  return `player-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyPlayer(index: number): PlayerFormValue {
  return {
    key: createPlayerKey(index),
    name: '',
    gender: '',
    birthDate: '',
    phoneNumber: '',
    tshirtSize: '',
    // 기본은 소속. 외부 선수만 신청자가 체크를 해제한다.
    isClubMember: true,
  };
}
